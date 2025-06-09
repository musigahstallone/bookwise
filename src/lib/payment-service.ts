
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
  serverTimestamp, // Added for easier timestamp updates
} from "firebase/firestore";
import { createStripePaymentIntent, type StripePaymentIntent } from "./stripe-integration"; // Import StripePaymentIntent type
import { initiateStkPush, type StkPushResponse, type MpesaConfig } from "./mpesa-integration";
import type { AxiosError } from 'axios';
import type { OrderItemInput, CreateOrderData } from "./actions/trackingActions";
import { handleCreateOrder } from "./actions/trackingActions";
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
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  paymentId?: string; // Stripe PaymentIntent ID or M-Pesa CheckoutRequestID
  clientSecret?: string; // For Stripe
  checkoutUrl?: string;
  message?: string;
}

// --- M-Pesa Specific Response Structures for Storing ---
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
// --- End M-Pesa Specific ---


export interface TransactionRecord {
  userId: string;
  userEmail?: string;

  items: OrderItemInput[]; // Essential for creating the order later
  amount: number;          // Amount in the transaction currency
  currency: string;        // Currency of the transaction (e.g., KES for M-Pesa, USD for Stripe)
  regionCode: string;      // Region code used for the transaction (influences display currency)
  itemCount: number;       // Number of items

  paymentMethod: PaymentMethod;
  paymentGatewayId: string; // M-Pesa CheckoutRequestID or Stripe PaymentIntentID
  status: "pending" | "completed" | "failed";
  customerMessage?: string;   // User-facing message, e.g. from M-Pesa ResponseDescription or CustomerMessage

  orderId?: string; // Firestore ID of the 'orders' document, added after successful order creation

  // Provider-specific raw responses
  mpesaInitialResponse?: MpesaInitialApiResponse; // Initial response from Safaricom STK push
  mpesaCallbackResponse?: MpesaStkCallback;     // Full STK callback object from Safaricom
  stripePaymentIntentResponse?: Stripe.PaymentIntent | { clientSecret: string; paymentIntentId: string }; // Stripe PaymentIntent object

  createdAt: Timestamp;
  updatedAt: Timestamp;
}


const TRANSACTIONS_COLLECTION = "transactions";

// Record a transaction in Firestore
async function recordTransaction(
  transactionInput: Omit<TransactionRecord, 'createdAt' | 'updatedAt' | 'orderId'>
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      ...transactionInput,
      orderId: transactionInput.orderId || null, // Ensure orderId is explicitly null if not provided
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Transaction recorded with ID: ${docRef.id} for paymentGatewayId: ${transactionInput.paymentGatewayId}`);
    return docRef.id;
  } catch (error) {
    console.error("Error recording transaction:", error);
    throw error;
  }
}

// Handle Stripe Payment
async function handleStripePayment(
  details: PaymentDetails
): Promise<PaymentResponse> {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      throw new Error("Stripe configuration missing.");
    }

    const stripeResponse = await createStripePaymentIntent(
      {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // Optional here, mostly for webhook verification
      },
      {
        amount: details.amount, // Expected in cents
        currency: details.currency.toLowerCase(), // e.g. "usd"
        metadata: { userId: details.userId, itemsCount: details.items.length.toString(), orderReference: `BOOKWISE-${Date.now()}` },
        receipt_email: details.email,
      }
    );
    
    const initialStripeResponseData = {
        paymentIntentId: stripeResponse.paymentIntentId,
        clientSecret: stripeResponse.clientSecret,
        // You could add more fields from the created PaymentIntent object if needed
    };

    await recordTransaction({
      userId: details.userId,
      userEmail: details.email,
      items: details.items,
      amount: details.amount, 
      currency: details.currency,
      regionCode: details.regionCode,
      itemCount: details.itemCount,
      paymentMethod: "stripe",
      status: "pending",
      paymentGatewayId: stripeResponse.paymentIntentId,
      customerMessage: "Stripe payment initiated. Waiting for confirmation.",
      stripePaymentIntentResponse: initialStripeResponseData,
    });

    return {
      success: true,
      paymentId: stripeResponse.paymentIntentId,
      clientSecret: stripeResponse.clientSecret,
    };
  } catch (error) {
    console.error("Stripe payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Stripe payment processing failed.";
    return { success: false, error: errorMessage };
  }
}


// Handle M-Pesa Payment
async function handleMpesaPayment(
  details: PaymentDetails // details.amount is expected to be in KES here
): Promise<PaymentResponse> {
  const mpesaEnv = process.env.MPESA_ENVIRONMENT as MpesaConfig['environment'] || "sandbox";
  try {
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET || !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY || !process.env.MPESA_CALLBACK_URL) {
      throw new Error("M-Pesa configuration is incomplete. Ensure all MPESA_ environment variables are set.");
    }
    if (!details.phoneNumber) {
      throw new Error("Phone number is required for M-Pesa payments.");
    }
    if (details.currency.toUpperCase() !== 'KES') {
        throw new Error("M-Pesa payments must be in KES. Amount passed was in " + details.currency);
    }

    // Sanitize AccountReference and TransactionDesc
    let accountRef = (details.items[0]?.bookId || 'BOOKWISE').replace(/[^a-zA-Z0-9]/g, '');
    if (accountRef.length > 12) accountRef = accountRef.substring(0, 12);
    if (!accountRef) accountRef = "BookWiseOrder";


    let transactionDesc = `Order ${details.itemCount} items`;
    if (transactionDesc.length > 100) transactionDesc = transactionDesc.substring(0, 100);


    const mpesaApiAmount = mpesaEnv === 'sandbox' ? 1 : Math.round(details.amount);
    if (mpesaEnv === 'sandbox' && Math.round(details.amount) !== 1) {
        console.warn(`M-Pesa Sandbox: Original order amount KES ${details.amount} overridden to ${mpesaApiAmount} for API call.`);
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
        phoneNumber: details.phoneNumber, // Already normalized by PaymentHandler
        amount: mpesaApiAmount,
        accountReference: accountRef,
        transactionDesc: transactionDesc,
      }
    );
    
    // Cast the StkPushResponse to MpesaInitialApiResponse for storage
    const initialResponseToStore: MpesaInitialApiResponse = { ...mpesaResponse };


    if (mpesaResponse.ResponseCode !== "0") {
      console.error("M-Pesa STK Push initiation failed directly:", mpesaResponse);
      const apiErrorMessage = mpesaResponse.CustomerMessage || mpesaResponse.ResponseDescription || "M-Pesa STK push initiation failed.";
      
      await recordTransaction({
        userId: details.userId,
        userEmail: details.email,
        items: details.items,
        amount: details.amount, // Record the actual KES amount
        currency: "KES",
        regionCode: details.regionCode,
        itemCount: details.itemCount,
        paymentMethod: "mpesa",
        status: "failed",
        paymentGatewayId: mpesaResponse.CheckoutRequestID || `FAILED_INIT_${Date.now()}`,
        customerMessage: apiErrorMessage,
        mpesaInitialResponse: initialResponseToStore,
      });
      return { success: false, error: apiErrorMessage, paymentId: mpesaResponse.CheckoutRequestID };
    }

    await recordTransaction({
      userId: details.userId,
      userEmail: details.email,
      items: details.items,
      amount: details.amount, // Record the actual KES amount
      currency: "KES",
      regionCode: details.regionCode,
      itemCount: details.itemCount,
      paymentMethod: "mpesa",
      status: "pending",
      paymentGatewayId: mpesaResponse.CheckoutRequestID,
      customerMessage: mpesaResponse.CustomerMessage,
      mpesaInitialResponse: initialResponseToStore,
    });

    return {
      success: true,
      paymentId: mpesaResponse.CheckoutRequestID,
      message: mpesaResponse.CustomerMessage || "STK Push initiated. Please complete payment on your phone."
    };

  } catch (error: any) {
    console.error("M-Pesa payment processing error in handleMpesaPayment:", error);
    let errorMessage = "M-Pesa payment failed. Please try again later.";
     if (error.isAxiosError) {
        const axiosError = error as AxiosError<any>; // Type assertion
        const errorData = axiosError.response?.data;
        errorMessage = errorData?.errorMessage || errorData?.fault?.faultstring || errorData?.CustomerMessage || errorData?.ResponseDescription || JSON.stringify(errorData) || axiosError.message;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

// Handle Mock Payment
async function handleMockPayment(
  details: PaymentDetails
): Promise<PaymentResponse> {
  try {
    const mockPaymentGatewayId = `mock_${Date.now()}_${details.items[0]?.bookId?.substring(0,5) || 'cart'}`;
    
    // 1. Record the transaction
    const transactionFirebaseId = await recordTransaction({
      userId: details.userId,
      userEmail: details.email,
      items: details.items,
      amount: details.amount,
      currency: details.currency,
      regionCode: details.regionCode,
      itemCount: details.itemCount,
      paymentMethod: "mock",
      status: "completed", // Mock payment is instantly completed
      paymentGatewayId: mockPaymentGatewayId,
      customerMessage: "Mock payment successful.",
    });

    // 2. Create the order
    const orderPayload: CreateOrderData = {
        userId: details.userId,
        items: details.items,
        totalAmountUSD: details.currency.toUpperCase() === 'USD' ? details.amount : details.amount / (parseFloat(process.env.KES_TO_USD_RATE || "130")), // Approximate if not USD
        regionCode: details.regionCode,
        currencyCode: details.currency,
        itemCount: details.itemCount,
        status: "completed",
        paymentGatewayId: mockPaymentGatewayId,
        paymentMethod: "mock",
    };
    const orderResult = await handleCreateOrder(orderPayload);

    // 3. Update the transaction with the orderId
    if (orderResult.success && orderResult.orderId) {
        const transactionDocRef = doc(db, TRANSACTIONS_COLLECTION, transactionFirebaseId);
        await updateDoc(transactionDocRef, { 
            orderId: orderResult.orderId,
            updatedAt: serverTimestamp() 
        });
    } else {
        console.warn(`Mock payment: Order creation failed or orderId not returned for transaction ${transactionFirebaseId}. Message: ${orderResult.message}`);
    }

    return {
      success: true,
      paymentId: mockPaymentGatewayId,
      message: "Mock payment processed and order created."
    };
  } catch (error) {
    console.error("Mock payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Mock payment processing failed.";
    return { success: false, error: errorMessage };
  }
}


// Main payment processing function called by API route
export async function processPayment(
  method: PaymentMethod,
  details: PaymentDetails
): Promise<PaymentResponse> {
  switch (method) {
    case "stripe":
      return handleStripePayment(details);
    case "mpesa":
      return handleMpesaPayment(details);
    case "mock":
      return handleMockPayment(details);
    default:
      return { success: false, error: "Invalid payment method selected." };
  }
}


// Called by M-Pesa Webhook
export async function updateTransactionAndCreateOrderIfNeeded(
  paymentGatewayId: string, // M-Pesa CheckoutRequestID
  mpesaFullCallbackData: MpesaStkCallback // Full stkCallback object for M-Pesa
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
    
    const callbackStatus = mpesaFullCallbackData.ResultCode === 0 ? "completed" : "failed";
    
    const dataToUpdate: Partial<TransactionRecord> & {updatedAt: any, mpesaCallbackResponse: MpesaStkCallback, customerMessage: string} = { // Ensure all updated fields are here
      status: callbackStatus,
      updatedAt: serverTimestamp(),
      mpesaCallbackResponse: mpesaFullCallbackData,
      customerMessage: mpesaFullCallbackData.ResultDesc,
    };

    await updateDoc(transactionDocRef, dataToUpdate);
    console.log(`M-Pesa Transaction ${transactionDocRef.id} (PGID: ${paymentGatewayId}) status updated to ${callbackStatus}.`);

    if (callbackStatus === "completed") {
      const orderPayload: CreateOrderData = {
        userId: transactionData.userId,
        items: transactionData.items,
        totalAmountUSD: transactionData.currency.toUpperCase() === 'USD' ? transactionData.amount : transactionData.amount / (parseFloat(process.env.KES_TO_USD_RATE || "130")),
        regionCode: transactionData.regionCode,
        currencyCode: transactionData.currency, // This was KES for M-Pesa
        itemCount: transactionData.itemCount,
        status: "completed",
        paymentGatewayId: paymentGatewayId,
        paymentMethod: "mpesa",
      };
      
      const orderResult = await handleCreateOrder(orderPayload);
      if (orderResult.success && orderResult.orderId) {
          await updateDoc(transactionDocRef, { 
              orderId: orderResult.orderId,
              updatedAt: serverTimestamp() // Update timestamp again
            });
          console.log(`Order ${orderResult.orderId} created for successful M-Pesa transaction ${paymentGatewayId}. Transaction updated with orderId.`);
      } else {
          console.error(`Order creation failed for M-Pesa transaction ${paymentGatewayId} after successful callback. Message: ${orderResult.message}`);
      }
    } else {
      console.log(`M-Pesa payment ${paymentGatewayId} failed or was cancelled. No order created. Status: ${callbackStatus}, Desc: ${mpesaFullCallbackData.ResultDesc}`);
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
        
        const newStatus = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';
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

        if (newStatus === 'completed') {
             const orderPayload: CreateOrderData = {
                userId: transactionData.userId,
                items: transactionData.items,
                totalAmountUSD: transactionData.amount / 100, // Convert cents to dollars
                regionCode: transactionData.regionCode,
                currencyCode: transactionData.currency, // This was 'usd' for stripe
                itemCount: transactionData.itemCount,
                status: "completed",
                paymentGatewayId: paymentIntentId,
                paymentMethod: "stripe",
            };
            const orderResult = await handleCreateOrder(orderPayload);
             if (orderResult.success && orderResult.orderId) {
                await updateDoc(transactionDocRef, { 
                    orderId: orderResult.orderId,
                    updatedAt: serverTimestamp() 
                });
                console.log(`Order ${orderResult.orderId} created for successful Stripe payment ${paymentIntentId}. Transaction updated with orderId.`);
            } else {
                console.error(`Order creation failed for Stripe transaction ${paymentIntentId} after successful webhook. Message: ${orderResult.message}`);
            }
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
