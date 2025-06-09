
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
  amount: number; // For M-Pesa, this should be in KES. For Stripe, in smallest currency unit (e.g., cents).
  currency: string;
  userId: string;
  items: OrderItemInput[];
  email?: string;
  phoneNumber?: string; // Normalized to 254xxxxxxxxx for M-Pesa
  regionCode: string;
  itemCount: number;
  actualAmountInSelectedCurrency: number; // The amount in the currency the user sees (e.g., KES 1300, USD 10)
}

export interface PaymentApiResponse { // Renamed from PaymentResponse
  success: boolean;
  error?: string;
  orderId?: string; // ID of the pending order created
  paymentGatewayId?: string; // Stripe PaymentIntent ID or M-Pesa CheckoutRequestID
  clientSecret?: string; // For Stripe
  message?: string;
}

// M-Pesa Specific Response Structures for Storing
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
  orderId: string; // Link to the 'orders' document
  paymentMethod: PaymentMethod;
  paymentGatewayId: string; // M-Pesa CheckoutRequestID or Stripe PaymentIntentID
  status: OrderStatus; // "pending", "completed", "failed"
  customerMessage?: string;
  mpesaInitialResponse?: MpesaInitialApiResponse;
  mpesaCallbackResponse?: MpesaStkCallback;
  stripePaymentIntentResponse?: Stripe.PaymentIntent | { clientSecret: string; paymentIntentId: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}


const TRANSACTIONS_COLLECTION = "transactions";

// Record a transaction in Firestore
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

// Creates a PENDING order, then initiates payment and records transaction
async function createPendingOrderAndInitiatePayment(
  details: PaymentDetails,
  paymentMethod: PaymentMethod,
  initiationFn: (details: PaymentDetails, orderId: string) => Promise<PaymentApiResponse>
): Promise<PaymentApiResponse> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, error: "Firebase Project ID not configured." };
  }

  // 1. Create a pending order first
  const orderPayload: CreateOrderData = {
    userId: details.userId,
    items: details.items,
    totalAmountUSD: details.currency.toUpperCase() === 'USD' ? details.actualAmountInSelectedCurrency : details.actualAmountInSelectedCurrency / (parseFloat(process.env.KES_TO_USD_RATE || "130")), // Calculate USD equivalent
    regionCode: details.regionCode,
    currencyCode: details.currency, // The currency user pays in
    actualAmountPaid: details.actualAmountInSelectedCurrency, // Actual amount in display/payment currency
    itemCount: details.itemCount,
    status: "pending",
    paymentMethod: paymentMethod,
  };

  const orderResult = await handleCreateOrder(orderPayload);
  if (!orderResult.success || !orderResult.orderId) {
    return { success: false, error: `Failed to create pending order: ${orderResult.message || "Unknown error"}` };
  }
  const pendingOrderId = orderResult.orderId;

  // 2. Now initiate the payment with the specific provider, passing the pendingOrderId
  try {
    const paymentInitiationResponse = await initiationFn(details, pendingOrderId);
    
    if (!paymentInitiationResponse.success) {
      // Payment initiation failed, mark order as failed
      await updateOrderStatus(pendingOrderId, "failed", { paymentMethod });
      return { ...paymentInitiationResponse, orderId: pendingOrderId }; // Return error from payment initiation
    }
    
    // Payment initiation successful, transaction was recorded by initiationFn with orderId
    // The order is already pending, so just return the success response.
    // The paymentGatewayId should be set on the order by the webhook or finalization step.
    await updateOrderStatus(pendingOrderId, "pending", { paymentGatewayId: paymentInitiationResponse.paymentGatewayId, paymentMethod});

    return { ...paymentInitiationResponse, orderId: pendingOrderId };

  } catch (initiationError: any) {
    console.error(`Error during payment initiation for order ${pendingOrderId} with ${paymentMethod}:`, initiationError);
    await updateOrderStatus(pendingOrderId, "failed", { paymentMethod }); // Mark order as failed
    return { success: false, error: initiationError.message || "Payment initiation failed after order creation.", orderId: pendingOrderId };
  }
}


// Handle Stripe Payment
async function handleStripePayment(
  details: PaymentDetails,
  orderId: string // ID of the PENDING order
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
        amount: details.amount, // Expected in cents
        currency: details.currency.toLowerCase(),
        metadata: { userId: details.userId, orderId: orderId, itemsCount: details.items.length.toString() },
        receipt_email: details.email,
      }
    );
    
    await recordTransaction({
      userId: details.userId,
      orderId: orderId,
      paymentMethod: "stripe",
      status: "pending", // Payment intent created, waiting for user action / webhook
      paymentGatewayId: stripeResponse.paymentIntentId,
      customerMessage: "Stripe payment initiated. Waiting for confirmation.",
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


// Handle M-Pesa Payment
async function handleMpesaPayment(
  details: PaymentDetails,
  orderId: string // ID of the PENDING order
): Promise<PaymentApiResponse> {
  const mpesaEnv = process.env.MPESA_ENVIRONMENT as MpesaConfig['environment'] || "sandbox";
  try {
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET || !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY || !process.env.MPESA_CALLBACK_URL) {
      throw new Error("M-Pesa configuration is incomplete.");
    }
    if (!details.phoneNumber) throw new Error("Phone number is required for M-Pesa.");
    if (details.currency.toUpperCase() !== 'KES') throw new Error("M-Pesa payments must be in KES.");

    let accountRef = orderId.substring(0,12); // Use orderId as account reference
    let transactionDesc = `Order ${orderId.substring(0,8)}`;
    if (transactionDesc.length > 100) transactionDesc = transactionDesc.substring(0, 100);

    const mpesaApiAmount = mpesaEnv === 'sandbox' ? 1 : Math.round(details.amount); // details.amount is KES here
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
      message: mpesaResponse.CustomerMessage || "STK Push initiated.",
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

// Handle Mock Payment
async function handleMockPayment(
  details: PaymentDetails,
  orderId: string // ID of the PENDING order
): Promise<PaymentApiResponse> {
  try {
    const mockPaymentGatewayId = `mock_${orderId}`;
    
    await recordTransaction({
      userId: details.userId,
      orderId: orderId,
      paymentMethod: "mock",
      status: "completed", // Mock payment is instantly completed
      paymentGatewayId: mockPaymentGatewayId,
      customerMessage: "Mock payment successful.",
    });

    // Since order was already created as pending, now update its status
    await updateOrderStatus(orderId, "completed", { paymentGatewayId: mockPaymentGatewayId, paymentMethod: "mock" });

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


// Main payment processing function called by API route
export async function processPayment(
  method: PaymentMethod,
  details: PaymentDetails
): Promise<PaymentApiResponse> { // Changed return type
  const initiationFunction = (currentDetails: PaymentDetails, currentOrderId: string) => {
    switch (method) {
      case "stripe":
        return handleStripePayment(currentDetails, currentOrderId);
      case "mpesa":
        return handleMpesaPayment(currentDetails, currentOrderId);
      case "mock":
        return handleMockPayment(currentDetails, currentOrderId);
      default:
        throw new Error("Invalid payment method selected for initiation.");
    }
  };
  return createPendingOrderAndInitiatePayment(details, method, initiationFunction);
}


// Called by M-Pesa Webhook
export async function updateTransactionAndCreateOrderIfNeeded(
  paymentGatewayId: string, // M-Pesa CheckoutRequestID
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

    // Now update the linked order's status
    if (transactionData.orderId) {
        await updateOrderStatus(transactionData.orderId, callbackStatus, { paymentGatewayId, paymentMethod: "mpesa" });
        console.log(`Order ${transactionData.orderId} status updated to ${callbackStatus} based on M-Pesa callback for PGID ${paymentGatewayId}.`);
    } else {
        console.error(`M-Pesa callback for PGID ${paymentGatewayId} processed, but transaction ${transactionDocRef.id} has no orderId.`);
    }

  } catch (error) {
    console.error(`Error in updateTransactionAndCreateOrderIfNeeded for M-Pesa paymentId ${paymentGatewayId}:`, error);
  }
}


// Called by Stripe Webhook
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

        // Now update the linked order's status
        if (transactionData.orderId) {
            await updateOrderStatus(transactionData.orderId, newStatus, { paymentGatewayId: paymentIntentId, paymentMethod: "stripe" });
            console.log(`Order ${transactionData.orderId} status updated to ${newStatus} based on Stripe webhook for PI ${paymentIntentId}.`);
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


    