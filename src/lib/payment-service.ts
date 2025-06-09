
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
} from "firebase/firestore";
import { createStripePaymentIntent } from "./stripe-integration";
import { initiateStkPush, type StkPushResponse } from "./mpesa-integration"; // Import StkPushResponse
import type { AxiosError } from 'axios';
import type { OrderItemInput, CreateOrderData } from "./actions/trackingActions"; // Import CreateOrderData
import { handleCreateOrder } from "./actions/trackingActions";


export type PaymentMethod = "stripe" | "mpesa" | "mock";

export interface PaymentDetails {
  amount: number; // For M-Pesa, this should be in KES. For Stripe, in smallest currency unit (e.g., cents).
  currency: string;
  userId: string;
  items: OrderItemInput[]; // Changed from bookId to items array
  email?: string;
  phoneNumber?: string; // Normalized to 254xxxxxxxxx for M-Pesa
  regionCode: string; // Added for currency context
  itemCount: number; // Added for order context
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  paymentId?: string; // Stripe PaymentIntent ID or M-Pesa CheckoutRequestID
  clientSecret?: string; // For Stripe
  checkoutUrl?: string;
  message?: string; // For user feedback e.g. on pending status
}

interface TransactionRecord {
  userId: string;
  items: OrderItemInput[]; // Store full item details
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "completed" | "failed";
  paymentId?: string; // M-Pesa CheckoutRequestID or Stripe PaymentIntentID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: {
    initialResponse?: any; // Store initial STK push API response
    callbackResponse?: any; // Store M-Pesa callback (stkCallback object)
    stripeClientSecret?: string;
    [key: string]: any;
  };
  // Fields needed for creating order later
  regionCode: string;
  itemCount: number;
  userEmail?: string; // Capture email if available for order creation context
}

const TRANSACTIONS_COLLECTION = "transactions";

// Record a transaction in Firestore
async function recordTransaction(transactionData: Omit<TransactionRecord, 'createdAt' | 'updatedAt' | 'paymentId'> & { paymentId: string }): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      ...transactionData,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Transaction recorded with ID: ${docRef.id} for paymentId: ${transactionData.paymentId}`);
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
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe configuration missing: STRIPE_SECRET_KEY not set.");
    }
     if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      throw new Error("Stripe configuration missing: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set.");
    }

    const stripeResponse = await createStripePaymentIntent(
      {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      {
        amount: details.amount,
        currency: details.currency.toLowerCase(),
        metadata: { userId: details.userId, itemsCount: details.items.length.toString(), orderReference: `BOOKWISE-${Date.now()}` },
        receipt_email: details.email,
      }
    );

    await recordTransaction({
      userId: details.userId,
      items: details.items,
      amount: details.amount, // For Stripe this is in cents, but store consistently if needed or convert
      currency: details.currency,
      paymentMethod: "stripe",
      status: "pending", // Stripe payment can also be pending until webhook confirmation
      paymentId: stripeResponse.paymentIntentId,
      metadata: { stripeClientSecret: stripeResponse.clientSecret, initialResponse: stripeResponse },
      regionCode: details.regionCode,
      itemCount: details.itemCount,
      userEmail: details.email,
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

    const accountRef = details.items.map(item => item.bookId).join(',').substring(0,10) + Date.now().toString().slice(-2) || "BookWiseOrder";
    const transactionDesc = `Order of ${details.items.length} books`.substring(0, 100);

    const mpesaApiAmount = process.env.MPESA_ENVIRONMENT === 'sandbox' ? 1 : Math.round(details.amount);
    if (process.env.MPESA_ENVIRONMENT === 'sandbox' && Math.round(details.amount) !== 1) {
        console.warn(`M-Pesa Sandbox: Original order amount KES ${details.amount} overridden to ${mpesaApiAmount} for API call.`);
    }

    const mpesaResponse: StkPushResponse = await initiateStkPush(
      {
        consumerKey: process.env.MPESA_CONSUMER_KEY,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET,
        shortCode: process.env.MPESA_SHORTCODE,
        passkey: process.env.MPESA_PASSKEY,
        callbackUrl: process.env.MPESA_CALLBACK_URL,
        environment: process.env.MPESA_ENVIRONMENT as "sandbox" | "production" || "sandbox",
      },
      {
        phoneNumber: details.phoneNumber,
        amount: mpesaApiAmount,
        accountReference: accountRef,
        transactionDesc: transactionDesc,
      }
    );

    if (mpesaResponse.ResponseCode !== "0") {
        console.error("M-Pesa STK Push initiation failed directly:", mpesaResponse);
        const apiErrorMessage = mpesaResponse.CustomerMessage || mpesaResponse.ResponseDescription || "M-Pesa STK push initiation failed.";
        // Record a failed transaction attempt
         await recordTransaction({
          userId: details.userId,
          items: details.items,
          amount: details.amount,
          currency: "KES",
          paymentMethod: "mpesa",
          status: "failed", // Mark as failed immediately
          paymentId: mpesaResponse.CheckoutRequestID || `FAILED_INIT_${Date.now()}`,
          metadata: { initialResponse: mpesaResponse },
          regionCode: details.regionCode,
          itemCount: details.itemCount,
          userEmail: details.email,
        });
        return { success: false, error: apiErrorMessage, paymentId: mpesaResponse.CheckoutRequestID };
    }

    await recordTransaction({
      userId: details.userId,
      items: details.items,
      amount: details.amount,
      currency: "KES",
      paymentMethod: "mpesa",
      status: "pending",
      paymentId: mpesaResponse.CheckoutRequestID,
      metadata: { initialResponse: mpesaResponse },
      regionCode: details.regionCode,
      itemCount: details.itemCount,
      userEmail: details.email,
    });

    return {
      success: true,
      paymentId: mpesaResponse.CheckoutRequestID,
      message: "STK Push initiated. Please complete payment on your phone."
    };
  } catch (error: any) {
    console.error("M-Pesa payment processing error in handleMpesaPayment:", error);
    let errorMessage = "M-Pesa payment failed. Please try again later.";
    if (error.isAxiosError) {
        const axiosError = error as AxiosError<any>;
        errorMessage = axiosError.response?.data?.errorMessage || axiosError.response?.data?.fault?.faultstring || axiosError.response?.data?.CustomerMessage || axiosError.response?.data?.ResponseDescription || JSON.stringify(axiosError.response?.data) || axiosError.message;
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
    const mockPaymentId = `mock_${Date.now()}_${details.items[0]?.bookId?.substring(0,5) || 'cart'}`;
    const transactionFirebaseId = await recordTransaction({
      userId: details.userId,
      items: details.items,
      amount: details.amount,
      currency: details.currency,
      paymentMethod: "mock",
      status: "completed",
      paymentId: mockPaymentId,
      regionCode: details.regionCode,
      itemCount: details.itemCount,
      userEmail: details.email,
    });

    // For mock, directly create the order
    const orderPayload: CreateOrderData = {
        userId: details.userId,
        items: details.items,
        totalAmountUSD: details.currency === 'USD' ? details.amount : details.amount / 130, // Approximate if not USD
        regionCode: details.regionCode,
        currencyCode: details.currency,
        itemCount: details.itemCount,
        status: "completed",
        paymentGatewayId: mockPaymentId,
        paymentMethod: "mock",
    };
    await handleCreateOrder(orderPayload);


    return {
      success: true,
      paymentId: mockPaymentId,
    };
  } catch (error) {
    console.error("Mock payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Mock payment processing failed.";
    return { success: false, error: errorMessage };
  }
}

// Main payment processing function
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


export async function updateTransactionAndCreateOrderIfNeeded(
  paymentId: string, // M-Pesa CheckoutRequestID or Stripe PaymentIntent ID
  callbackStatus: "completed" | "failed",
  mpesaCallbackData?: any // Full stkCallback object for M-Pesa
): Promise<void> {
  try {
    const transactionQuery = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("paymentId", "==", paymentId),
      limit(1)
    );
    const snapshot = await getDocs(transactionQuery);

    if (snapshot.empty) {
      console.warn(`Transaction with PaymentGatewayID ${paymentId} not found for status update or order creation.`);
      return;
    }

    const transactionDocRef = snapshot.docs[0].ref;
    const transactionData = snapshot.docs[0].data() as TransactionRecord;

    // Prevent re-processing completed/failed transactions that might receive duplicate webhooks
    if (transactionData.status === "completed" || transactionData.status === "failed") {
        console.log(`Transaction ${transactionDocRef.id} (PaymentID: ${paymentId}) already processed with status: ${transactionData.status}. Ignoring new callback.`);
        return;
    }
    
    const dataToUpdate: Partial<TransactionRecord> = {
      status: callbackStatus,
      updatedAt: Timestamp.now(),
      metadata: { ...transactionData.metadata, callbackResponse: mpesaCallbackData || null },
    };

    await updateDoc(transactionDocRef, dataToUpdate);
    console.log(`Transaction ${transactionDocRef.id} (PaymentID: ${paymentId}) status updated to ${callbackStatus}.`);

    if (callbackStatus === "completed") {
      // Create the order
      const orderPayload: CreateOrderData = {
        userId: transactionData.userId,
        items: transactionData.items,
        totalAmountUSD: transactionData.currency === 'USD' ? transactionData.amount : transactionData.amount / (process.env.KES_TO_USD_RATE ? parseFloat(process.env.KES_TO_USD_RATE) : 130), // Convert if KES, ensure rate exists
        regionCode: transactionData.regionCode,
        currencyCode: transactionData.currency,
        itemCount: transactionData.itemCount,
        status: "completed",
        paymentGatewayId: paymentId,
        paymentMethod: transactionData.paymentMethod,
        // userEmail: transactionData.userEmail, // Add if userEmail is part of CreateOrderData
      };
      
      console.log(`Creating order for successful transaction ${paymentId}. Payload:`, orderPayload);
      await handleCreateOrder(orderPayload);
      console.log(`Order created for transaction ${paymentId}.`);
    } else {
      console.log(`Payment ${paymentId} failed or was cancelled. No order created. Status: ${callbackStatus}`);
    }

  } catch (error) {
    console.error(`Error in updateTransactionAndCreateOrderIfNeeded for paymentId ${paymentId}:`, error);
  }
}

// This function is for Stripe webhooks that confirm PaymentIntent success
export async function finalizeStripeTransactionAndCreateOrder(paymentIntentId: string, paymentIntent: any) {
    try {
        const transactionQuery = query(
            collection(db, TRANSACTIONS_COLLECTION),
            where("paymentId", "==", paymentIntentId),
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

        if (transactionData.status === "completed") {
            console.log(`Stripe transaction ${paymentIntentId} already completed. Ignoring webhook.`);
            return;
        }
        
        const newStatus = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';

        await updateDoc(transactionDocRef, {
            status: newStatus,
            updatedAt: Timestamp.now(),
            metadata: { ...transactionData.metadata, stripeWebhookResponse: paymentIntent },
        });
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
            await handleCreateOrder(orderPayload);
            console.log(`Order created for successful Stripe payment ${paymentIntentId}.`);
        }

    } catch (error) {
        console.error(`Error finalizing Stripe transaction and creating order for ${paymentIntentId}:`, error);
    }
}
