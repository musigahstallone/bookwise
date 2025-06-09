
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
} from "firebase/firestore";
import { createStripePaymentIntent } from "./stripe-integration";
import { initiateStkPush } from "./mpesa-integration";
import type { AxiosError } from 'axios';

export type PaymentMethod = "stripe" | "mpesa" | "mock";

export interface PaymentDetails {
  amount: number; // For M-Pesa, this should be in KES. For Stripe, in smallest currency unit (e.g., cents).
  currency: string;
  userId: string;
  bookId: string; // Can be a single book ID or a generic reference like "multiple_items"
  email?: string;
  phoneNumber?: string; // Normalized to 254xxxxxxxxx for M-Pesa
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  paymentId?: string; // Stripe PaymentIntent ID or M-Pesa CheckoutRequestID
  clientSecret?: string; // For Stripe
  checkoutUrl?: string; 
}

interface TransactionRecord {
  userId: string;
  bookId: string;
  amount: number; 
  currency: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "completed" | "failed";
  paymentId?: string; 
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

const TRANSACTIONS_COLLECTION = "transactions";

// Record a transaction in Firestore
async function recordTransaction(transaction: TransactionRecord): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      ...transaction,
      createdAt: Timestamp.fromDate(transaction.createdAt),
      updatedAt: transaction.updatedAt ? Timestamp.fromDate(transaction.updatedAt) : Timestamp.fromDate(transaction.createdAt),
    });
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
        metadata: { userId: details.userId, bookId: details.bookId, orderReference: `BOOKWISE-${Date.now()}` },
        receipt_email: details.email,
      }
    );

    await recordTransaction({
      userId: details.userId,
      bookId: details.bookId,
      amount: details.amount, 
      currency: details.currency,
      paymentMethod: "stripe",
      status: "pending", 
      paymentId: stripeResponse.paymentIntentId,
      createdAt: new Date(),
      metadata: { clientSecret: stripeResponse.clientSecret }, 
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

    // Sanitize AccountReference: Max 12 chars, alphanumeric. If bookId is long, use a generic one.
    const accountRef = details.bookId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12) || "BookWiseOrder";
    // Sanitize TransactionDesc: Max 100 chars.
    const transactionDesc = `Purchase: ${details.bookId}`.substring(0, 100);

    // For M-Pesa Sandbox, the API often expects the amount to be 1.
    // We send 1 to the API if in sandbox, but record the actual transaction amount.
    const mpesaApiAmount = process.env.MPESA_ENVIRONMENT === 'sandbox' ? 1 : details.amount;
    if (process.env.MPESA_ENVIRONMENT === 'sandbox' && details.amount !== 1) {
        console.warn(`M-Pesa Sandbox: Original order amount KES ${details.amount} overridden to ${mpesaApiAmount} for API call.`);
    }


    const mpesaResponse = await initiateStkPush(
      {
        consumerKey: process.env.MPESA_CONSUMER_KEY,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET,
        shortCode: process.env.MPESA_SHORTCODE,
        passkey: process.env.MPESA_PASSKEY,
        callbackUrl: process.env.MPESA_CALLBACK_URL,
        environment: process.env.MPESA_ENVIRONMENT as "sandbox" | "production" || "sandbox",
      },
      {
        phoneNumber: details.phoneNumber, // Expected to be normalized to 254xxxxxxxxx by PaymentHandler
        amount: mpesaApiAmount, 
        accountReference: accountRef,
        transactionDesc: transactionDesc,
      }
    );

    // Check M-Pesa API response code for immediate failure
    // A ResponseCode of "0" indicates the STK push was successfully initiated.
    if (mpesaResponse.ResponseCode !== "0") {
        console.error("M-Pesa STK Push initiation failed directly:", mpesaResponse);
        // Use CustomerMessage if available, otherwise ResponseDescription
        const apiErrorMessage = mpesaResponse.CustomerMessage || mpesaResponse.ResponseDescription || "M-Pesa STK push initiation failed. Please check details and try again.";
        throw new Error(apiErrorMessage);
    }
    
    // Record the transaction with the *actual* order amount, not necessarily mpesaApiAmount
    await recordTransaction({
      userId: details.userId,
      bookId: details.bookId,
      amount: details.amount, // Record the actual KES amount of the order
      currency: "KES",
      paymentMethod: "mpesa",
      status: "pending", // Await callback for completion
      paymentId: mpesaResponse.CheckoutRequestID, // This is the ID to track
      createdAt: new Date(),
      metadata: { 
          merchantRequestId: mpesaResponse.MerchantRequestID, 
          initialResponseCode: mpesaResponse.ResponseCode,
          initialResponseDescription: mpesaResponse.ResponseDescription
        },
    });

    return {
      success: true,
      paymentId: mpesaResponse.CheckoutRequestID, 
    };
  } catch (error: any) {
    console.error("M-Pesa payment processing error in handleMpesaPayment:", error);
    let errorMessage = "M-Pesa payment failed. Please try again later.";
    // Try to extract a more specific message if available
    if (error.isAxiosError) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data) {
            // Safaricom error messages can be in various places
            errorMessage = axiosError.response.data.errorMessage || 
                           axiosError.response.data.fault?.faultstring || 
                           axiosError.response.data.CustomerMessage ||
                           axiosError.response.data.ResponseDescription || 
                           JSON.stringify(axiosError.response.data);
        } else {
            errorMessage = axiosError.message;
        }
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
    const mockPaymentId = `mock_${Date.now()}_${details.bookId.substring(0,5)}`;

    await recordTransaction({
      userId: details.userId,
      bookId: details.bookId,
      amount: details.amount,
      currency: details.currency,
      paymentMethod: "mock",
      status: "completed", 
      paymentId: mockPaymentId,
      createdAt: new Date(),
    });

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

// Update transaction status (typically called by webhook)
export async function updateTransactionStatus(
  paymentId: string, // For M-Pesa, this is CheckoutRequestID; for Stripe, PaymentIntent ID
  status: "completed" | "failed",
  updateMetadata?: Record<string, any> 
): Promise<void> {
  try {
    const transactionQuery = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("paymentId", "==", paymentId)
    );
    const snapshot = await getDocs(transactionQuery);

    if (!snapshot.empty) {
      const transactionDocRef = snapshot.docs[0].ref;
      const currentData = snapshot.docs[0].data();

      const dataToUpdate: {
        status: "completed" | "failed";
        metadata?: Record<string, any>;
        updatedAt: Timestamp;
      } = {
        status,
        updatedAt: Timestamp.now(),
      };

      if (updateMetadata) {
        dataToUpdate.metadata = { ...(currentData.metadata || {}), ...updateMetadata };
      }

      await updateDoc(transactionDocRef, dataToUpdate);
      console.log(`Transaction ${transactionDocRef.id} (PaymentGatewayID: ${paymentId}) status updated to ${status}.`);
      
      // TODO: If status is 'completed', trigger order fulfillment if not already done.
      // For example, if order creation was deferred until payment confirmation.
      // In the current app flow, order creation (handleCreateOrder in trackingActions)
      // happens *after* the client gets a success from PaymentHandler,
      // so this webhook is more for reconciliation and handling cases where client-side confirmation might fail.

    } else {
      console.warn(`Transaction with PaymentGatewayID ${paymentId} not found for status update. This might be okay if it's a very new transaction still being written, or an issue if the ID is incorrect.`);
    }
  } catch (error) {
    console.error("Error updating transaction status in Firestore:", error);
    // Don't re-throw here to prevent webhook from retrying indefinitely for Firestore issues,
    // but log it thoroughly. Consider an alert mechanism for persistent failures.
  }
}
