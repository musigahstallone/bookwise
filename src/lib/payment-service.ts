
import { db } from "./firebase";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { createStripePaymentIntent, type StripePaymentIntent } from "./stripe-integration";
import { initiateStkPush, type StkPushResponse, type MpesaConfig } from "./mpesa-integration";
import type { AxiosError } from 'axios';
import type { OrderItemInput, CreateOrderData, OrderStatus } from "./actions/trackingActions";
import { handleCreateOrder, updateOrderStatus } from "./actions/trackingActions";
import type Stripe from "stripe";


export type PaymentMethod = "stripe" | "mpesa" | "mock";

export interface PaymentDetails {
  amount: number; 
  currency: string;
  userId: string;
  items: OrderItemInput[];
  email?: string;
  phoneNumber?: string;
  regionCode: string;
  itemCount: number;
  actualAmountInSelectedCurrency: number;
}

export interface PaymentApiResponse {
  success: boolean;
  error?: string;
  orderId?: string; 
  paymentGatewayId?: string;
  clientSecret?: string; 
  message?: string;
}

export interface MpesaInitialApiResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaStkCallbackItem {
  Name: string;
  Value?: string | number;
}
export interface MpesaStkCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: MpesaStkCallbackItem[];
  };
}

export interface TransactionRecord {
  userId: string;
  orderId: string; 
  paymentMethod: PaymentMethod;
  paymentGatewayId: string; 
  status: OrderStatus; 
  customerMessage?: string;
  mpesaInitialResponse?: MpesaInitialApiResponse;
  mpesaCallbackResponse?: MpesaStkCallback;
  stripePaymentIntentResponse?: Stripe.PaymentIntent | { clientSecret: string; paymentIntentId: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}


const TRANSACTIONS_COLLECTION = "transactions";

async function recordTransaction(
  transactionInput: Omit<TransactionRecord, 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      ...transactionInput,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Transaction recorded with ID: ${docRef.id} for orderId: ${transactionInput.orderId}, paymentGatewayId: ${transactionInput.paymentGatewayId}`);
    return docRef.id;
  } catch (error) {
    console.error("Error recording transaction:", error);
    throw error;
  }
}

async function createInitialOrderAndInitiatePayment(
  details: PaymentDetails,
  paymentMethod: PaymentMethod,
  initiationFn: (details: PaymentDetails, orderId: string) => Promise<PaymentApiResponse>
): Promise<PaymentApiResponse> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, error: "Firebase Project ID not configured." };
  }

  // Determine initial status based on payment method
  const initialOrderStatus: OrderStatus = paymentMethod === 'mock' ? 'completed' : 'pending';

  const orderPayload: CreateOrderData = {
    userId: details.userId,
    userEmail: details.email,
    items: details.items,
    totalAmountUSD: details.currency.toUpperCase() === 'USD' ? details.actualAmountInSelectedCurrency : details.actualAmountInSelectedCurrency / (parseFloat(process.env.KES_TO_USD_RATE || "130")),
    regionCode: details.regionCode,
    currencyCode: details.currency,
    actualAmountPaid: paymentMethod === 'mock' ? details.actualAmountInSelectedCurrency : 0, // For mock, amount is "paid"
    itemCount: details.itemCount,
    status: initialOrderStatus,
    paymentMethod: paymentMethod,
    paymentGatewayId: paymentMethod === 'mock' ? `mock_${Date.now()}` : null, // For mock, generate a mock PG ID
  };

  const orderResult = await handleCreateOrder(orderPayload);
  if (!orderResult.success || !orderResult.orderId) {
    return { success: false, error: `Failed to create initial order: ${orderResult.message || "Unknown error"}` };
  }
  const initialOrderId = orderResult.orderId;

  // For mock payments, we might have already set it to completed. Transaction also done in handleMockPayment.
  if (paymentMethod === 'mock') {
    return { 
        success: true, 
        orderId: initialOrderId, 
        paymentGatewayId: orderPayload.paymentGatewayId!, // It's set for mock
        message: "Mock payment processed successfully." 
    };
  }

  // For Stripe and M-Pesa, now initiate the actual payment provider interaction
  try {
    const paymentInitiationResponse = await initiationFn(details, initialOrderId);
    
    if (!paymentInitiationResponse.success) {
      await updateOrderStatus(initialOrderId, "failed", { paymentMethod });
      return { ...paymentInitiationResponse, orderId: initialOrderId };
    }
    
    // Update order with paymentGatewayId if available from initiation
    if (paymentInitiationResponse.paymentGatewayId) {
        await updateOrderStatus(initialOrderId, "pending", { 
            paymentGatewayId: paymentInitiationResponse.paymentGatewayId, 
            paymentMethod 
        });
    }

    return { ...paymentInitiationResponse, orderId: initialOrderId };

  } catch (initiationError: any) {
    console.error(`Error during payment initiation for order ${initialOrderId} with ${paymentMethod}:`, initiationError);
    await updateOrderStatus(initialOrderId, "failed", { paymentMethod });
    return { success: false, error: initiationError.message || "Payment initiation failed after order creation.", orderId: initialOrderId };
  }
}


async function handleStripePayment(
  details: PaymentDetails,
  orderId: string 
): Promise<PaymentApiResponse> {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      throw new Error("Stripe configuration missing.");
    }

    const stripeResponse = await createStripePaymentIntent(
      {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      {
        amount: details.amount,
        currency: details.currency.toLowerCase(),
        metadata: { userId: details.userId, orderId: orderId, itemsCount: details.items.length.toString() },
        receipt_email: details.email,
      }
    );
    
    await recordTransaction({
      userId: details.userId,
      orderId: orderId,
      paymentMethod: "stripe",
      status: "pending", 
      paymentGatewayId: stripeResponse.paymentIntentId,
      customerMessage: "Stripe payment initiated. Waiting for user action or webhook.",
      stripePaymentIntentResponse: { clientSecret: stripeResponse.clientSecret, paymentIntentId: stripeResponse.paymentIntentId},
    });

    return {
      success: true,
      paymentGatewayId: stripeResponse.paymentIntentId,
      clientSecret: stripeResponse.clientSecret,
      orderId: orderId,
    };
  } catch (error) {
    console.error("Stripe payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Stripe payment processing failed.";
    return { success: false, error: errorMessage, orderId: orderId };
  }
}


async function handleMpesaPayment(
  details: PaymentDetails,
  orderId: string 
): Promise<PaymentApiResponse> {
  const mpesaEnv = process.env.MPESA_ENVIRONMENT as MpesaConfig['environment'] || "sandbox";
  try {
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET || !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY || !process.env.MPESA_CALLBACK_URL) {
      throw new Error("M-Pesa configuration is incomplete.");
    }
    if (!details.phoneNumber) throw new Error("Phone number is required for M-Pesa.");
    if (details.currency.toUpperCase() !== 'KES') throw new Error("M-Pesa payments must be in KES.");

    let accountRef = orderId.substring(0,12); 
    let transactionDesc = `Order ${orderId.substring(0,8)}`;
    if (transactionDesc.length > 100) transactionDesc = transactionDesc.substring(0, 100);

    const mpesaApiAmount = mpesaEnv === 'sandbox' ? 1 : Math.round(details.amount);
     if (mpesaEnv === 'sandbox' && Math.round(details.amount) !== 1) {
        console.warn(`M-Pesa Sandbox: Original order amount KES ${details.amount} overridden to ${mpesaApiAmount} for API call for order ${orderId}.`);
    }

    const mpesaResponse: StkPushResponse = await initiateStkPush(
      {
        consumerKey: process.env.MPESA_CONSUMER_KEY,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET,
        shortCode: process.env.MPESA_SHORTCODE,
        passkey: process.env.MPESA_PASSKEY,
        callbackUrl: process.env.MPESA_CALLBACK_URL,
        environment: mpesaEnv,
      },
      {
        phoneNumber: details.phoneNumber,
        amount: mpesaApiAmount,
        accountReference: accountRef,
        transactionDesc: transactionDesc,
      }
    );
    
    const initialResponseToStore: MpesaInitialApiResponse = { ...mpesaResponse };

    if (mpesaResponse.ResponseCode !== "0") {
      const apiErrorMessage = mpesaResponse.CustomerMessage || mpesaResponse.ResponseDescription || "M-Pesa STK push initiation failed.";
      await recordTransaction({
        userId: details.userId,
        orderId: orderId,
        paymentMethod: "mpesa",
        status: "failed",
        paymentGatewayId: mpesaResponse.CheckoutRequestID || `FAILED_INIT_${Date.now()}`,
        customerMessage: apiErrorMessage,
        mpesaInitialResponse: initialResponseToStore,
      });
      return { success: false, error: apiErrorMessage, paymentGatewayId: mpesaResponse.CheckoutRequestID, orderId: orderId };
    }

    await recordTransaction({
      userId: details.userId,
      orderId: orderId,
      paymentMethod: "mpesa",
      status: "pending",
      paymentGatewayId: mpesaResponse.CheckoutRequestID,
      customerMessage: mpesaResponse.CustomerMessage,
      mpesaInitialResponse: initialResponseToStore,
    });

    return {
      success: true,
      paymentGatewayId: mpesaResponse.CheckoutRequestID,
      message: mpesaResponse.CustomerMessage || "STK Push initiated. Waiting for confirmation.",
      orderId: orderId,
    };

  } catch (error: any) {
    console.error(`M-Pesa payment processing error in handleMpesaPayment for order ${orderId}:`, error);
    let errorMessage = "M-Pesa payment failed.";
     if (error.isAxiosError) {
        const axiosError = error as AxiosError<any>;
        const errorData = axiosError.response?.data;
        errorMessage = errorData?.errorMessage || errorData?.fault?.faultstring || errorData?.CustomerMessage || errorData?.ResponseDescription || JSON.stringify(errorData) || axiosError.message;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage, orderId: orderId };
  }
}

async function handleMockPayment(
  details: PaymentDetails,
  orderId: string 
): Promise<PaymentApiResponse> {
  try {
    const mockPaymentGatewayId = `mock_${orderId}`;
    
    // Transaction is recorded with completed status
    await recordTransaction({
      userId: details.userId,
      orderId: orderId,
      paymentMethod: "mock",
      status: "completed",
      paymentGatewayId: mockPaymentGatewayId,
      customerMessage: "Mock payment successful.",
    });

    // Order status is already "completed" as set by createInitialOrderAndInitiatePayment
    // So, no need to call updateOrderStatus here explicitly for "mock" if initial status was already "completed"

    return {
      success: true,
      paymentGatewayId: mockPaymentGatewayId,
      message: "Mock payment processed and order completed.",
      orderId: orderId,
    };
  } catch (error) {
    console.error("Mock payment error for order " + orderId + ":", error);
    const errorMessage = error instanceof Error ? error.message : "Mock payment processing failed.";
    return { success: false, error: errorMessage, orderId: orderId };
  }
}


export async function processPayment(
  method: PaymentMethod,
  details: PaymentDetails
): Promise<PaymentApiResponse> {
  const initiationFunction = (currentDetails: PaymentDetails, currentOrderId: string) => {
    switch (method) {
      case "stripe":
        return handleStripePayment(currentDetails, currentOrderId);
      case "mpesa":
        return handleMpesaPayment(currentDetails, currentOrderId);
      case "mock":
        // For mock, the order is created as 'completed' directly by createInitialOrderAndInitiatePayment
        // So handleMockPayment just needs to record the transaction.
        return handleMockPayment(currentDetails, currentOrderId);
      default:
        throw new Error("Invalid payment method selected for initiation.");
    }
  };
  return createInitialOrderAndInitiatePayment(details, method, initiationFunction);
}


export async function updateTransactionAndCreateOrderIfNeeded(
  paymentGatewayId: string, 
  mpesaFullCallbackData: MpesaStkCallback
): Promise<void> {
  try {
    const transactionQuery = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("paymentGatewayId", "==", paymentGatewayId),
      where("paymentMethod", "==", "mpesa"),
      limit(1)
    );
    const snapshot = await getDocs(transactionQuery);

    if (snapshot.empty) {
      console.warn(`M-Pesa transaction with CheckoutRequestID ${paymentGatewayId} not found for callback update.`);
      return;
    }

    const transactionDocRef = snapshot.docs[0].ref;
    const transactionData = snapshot.docs[0].data() as TransactionRecord;

    if (transactionData.status === "completed" || transactionData.status === "failed") {
        console.log(`M-Pesa transaction ${transactionDocRef.id} (PGID: ${paymentGatewayId}) already processed with status: ${transactionData.status}. Ignoring new callback.`);
        return;
    }
    
    const callbackStatus: OrderStatus = mpesaFullCallbackData.ResultCode === 0 ? "completed" : "failed";
    
    const dataToUpdate: Partial<TransactionRecord> & {updatedAt: any, mpesaCallbackResponse: MpesaStkCallback, customerMessage: string} = {
      status: callbackStatus,
      updatedAt: serverTimestamp(),
      mpesaCallbackResponse: mpesaFullCallbackData,
      customerMessage: mpesaFullCallbackData.ResultDesc,
    };

    await updateDoc(transactionDocRef, dataToUpdate);
    console.log(`M-Pesa Transaction ${transactionDocRef.id} (PGID: ${paymentGatewayId}) status updated to ${callbackStatus}.`);

    if (transactionData.orderId) {
        await updateOrderStatus(transactionData.orderId, callbackStatus, { paymentGatewayId, paymentMethod: "mpesa" });
        console.log(`Order ${transactionData.orderId} status updated to ${callbackStatus} based on M-Pesa callback for PGID ${paymentGatewayId}.`);
        
        // Placeholder for email on completion by webhook
        // if (callbackStatus === 'completed' && transactionData.userId) {
        //   const orderSnap = await getDoc(doc(db, 'orders', transactionData.orderId));
        //   if(orderSnap.exists()) {
        //      const order = orderSnap.data();
        //      // if (order.userEmail) { console.log(`TODO: Send webhook completion email to ${order.userEmail}`); }
        //   }
        // }
    } else {
        console.error(`M-Pesa callback for PGID ${paymentGatewayId} processed, but transaction ${transactionDocRef.id} has no orderId.`);
    }

  } catch (error) {
    console.error(`Error in updateTransactionAndCreateOrderIfNeeded for M-Pesa paymentId ${paymentGatewayId}:`, error);
  }
}


export async function finalizeStripeTransactionAndCreateOrder(paymentIntentId: string, paymentIntent: Stripe.PaymentIntent) {
    try {
        const transactionQuery = query(
            collection(db, TRANSACTIONS_COLLECTION),
            where("paymentGatewayId", "==", paymentIntentId),
            where("paymentMethod", "==", "stripe"),
            limit(1)
        );
        const snapshot = await getDocs(transactionQuery);

        if (snapshot.empty) {
            console.warn(`Stripe transaction with PaymentIntentID ${paymentIntentId} not found.`);
            return;
        }

        const transactionDocRef = snapshot.docs[0].ref;
        const transactionData = snapshot.docs[0].data() as TransactionRecord;

        if (transactionData.status === "completed" || transactionData.status === "failed") {
            console.log(`Stripe transaction ${paymentIntentId} already processed with status: ${transactionData.status}. Ignoring webhook.`);
            return;
        }
        
        const newStatus: OrderStatus = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';
        let customerMsg = `Stripe payment ${newStatus}.`;
        if (paymentIntent.last_payment_error?.message) {
            customerMsg = `Stripe payment failed: ${paymentIntent.last_payment_error.message}`;
        }
        
        const dataToUpdate: Partial<TransactionRecord> & {updatedAt: any, stripePaymentIntentResponse: Stripe.PaymentIntent, customerMessage: string } = {
            status: newStatus,
            updatedAt: serverTimestamp(),
            stripePaymentIntentResponse: paymentIntent,
            customerMessage: customerMsg,
        };

        await updateDoc(transactionDocRef, dataToUpdate);
        console.log(`Stripe transaction ${paymentIntentId} status updated to ${newStatus} via webhook.`);

        if (transactionData.orderId) {
            await updateOrderStatus(transactionData.orderId, newStatus, { paymentGatewayId: paymentIntentId, paymentMethod: "stripe" });
            console.log(`Order ${transactionData.orderId} status updated to ${newStatus} based on Stripe webhook for PI ${paymentIntentId}.`);

            // Placeholder for email on completion by webhook
            // if (newStatus === 'completed' && transactionData.userId) {
            //   const orderSnap = await getDoc(doc(db, 'orders', transactionData.orderId));
            //   if(orderSnap.exists()) {
            //      const order = orderSnap.data();
            //      // if (order.userEmail) { console.log(`TODO: Send webhook completion email to ${order.userEmail}`); }
            //   }
            // }
        } else {
             console.error(`Stripe webhook for PI ${paymentIntentId} processed, but transaction ${transactionDocRef.id} has no orderId.`);
        }

    } catch (error) {
        console.error(`Error finalizing Stripe transaction and creating order for ${paymentIntentId}:`, error);
    }
}

export function getMpesaCallbackItemValue(itemName: string, callbackMetadata?: { Item: MpesaStkCallbackItem[] }): string | number | undefined {
    if (!callbackMetadata || !callbackMetadata.Item) {
        return undefined;
    }
    const item = callbackMetadata.Item.find(i => i.Name === itemName);
    return item?.Value;
}
    