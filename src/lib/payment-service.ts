
import { db } from "./firebase";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { createStripePaymentIntent } from "./stripe-integration";
import { initiateStkPush } from "./mpesa-integration";
import type { AxiosError } from 'axios';

export type PaymentMethod = "stripe" | "mpesa" | "mock";

export interface PaymentDetails {
  amount: number; // For M-Pesa, this should be in KES. For Stripe, in smallest currency unit (e.g., cents).
  currency: string;
  userId: string;
  bookId: string;
  email?: string;
  phoneNumber?: string; // Normalized to 254xxxxxxxxx for M-Pesa
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  paymentId?: string;
  clientSecret?: string; // For Stripe
  checkoutUrl?: string; // For redirect-based payments (not used in current M-Pesa STK)
}

interface TransactionRecord {
  userId: string;
  bookId: string;
  amount: number; // Actual transaction amount
  currency: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "completed" | "failed";
  paymentId?: string; // e.g., Stripe PaymentIntent ID or M-Pesa CheckoutRequestID
  createdAt: Date;
  metadata?: Record<string, any>;
}

const TRANSACTIONS_COLLECTION = "transactions";

// Record a transaction in Firestore
async function recordTransaction(transaction: TransactionRecord) {
  try {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      ...transaction,
      createdAt: Timestamp.fromDate(transaction.createdAt),
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
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // Optional for client-side confirmation flow
      },
      {
        amount: details.amount, // Expected in smallest currency unit (e.g., cents)
        currency: details.currency.toLowerCase(),
        metadata: { userId: details.userId, bookId: details.bookId },
        receipt_email: details.email,
      }
    );

    await recordTransaction({
      userId: details.userId,
      bookId: details.bookId,
      amount: details.amount, // Store the amount in cents for Stripe consistency if desired, or convert back
      currency: details.currency,
      paymentMethod: "stripe",
      status: "pending", // Status becomes 'completed' after successful client-side confirmation or webhook
      paymentId: stripeResponse.paymentIntentId,
      createdAt: new Date(),
      metadata: { clientSecret: stripeResponse.clientSecret }, // Store client secret for client-side use
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

    const mpesaApiAmount = process.env.MPESA_ENVIRONMENT === 'sandbox' ? 1 : details.amount;
    if (process.env.MPESA_ENVIRONMENT === 'sandbox' && details.amount !== 1) {
        console.warn(`M-Pesa Sandbox: Original amount KES ${details.amount} overridden to 1 for sandbox API call.`);
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
        phoneNumber: details.phoneNumber, // Already normalized by PaymentHandler
        amount: mpesaApiAmount, // Use 1 for sandbox, actual for production
        accountReference: details.bookId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12) || "BookWise", // Sanitize and shorten
        transactionDesc: `BookWise: ${details.bookId}`.substring(0,100), // Max 100 chars
      }
    );

    // Check M-Pesa API response code for immediate failure
    if (mpesaResponse.ResponseCode !== "0") {
        console.error("M-Pesa STK Push initiation failed:", mpesaResponse);
        throw new Error(mpesaResponse.CustomerMessage || mpesaResponse.ResponseDescription || "M-Pesa STK push initiation failed.");
    }
    
    await recordTransaction({
      userId: details.userId,
      bookId: details.bookId,
      amount: details.amount, // Record the actual KES amount of the order
      currency: "KES",
      paymentMethod: "mpesa",
      status: "pending", // Await callback for completion
      paymentId: mpesaResponse.CheckoutRequestID,
      createdAt: new Date(),
      metadata: { 
          merchantRequestId: mpesaResponse.MerchantRequestID, 
          responseCode: mpesaResponse.ResponseCode,
          responseDescription: mpesaResponse.ResponseDescription
        },
    });

    return {
      success: true,
      paymentId: mpesaResponse.CheckoutRequestID, // This is what you track
    };
  } catch (error: any) {
    console.error("M-Pesa payment processing error:", error);
    let errorMessage = "M-Pesa payment failed.";
    if (error.isAxiosError) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data) {
            errorMessage = axiosError.response.data.errorMessage || axiosError.response.data.message || JSON.stringify(axiosError.response.data);
        } else {
            errorMessage = axiosError.message;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

// Handle Mock Payment (for testing)
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
      // No clientSecret or checkoutUrl needed for mock if handled on same page
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
  paymentId: string, // For M-Pesa, this is CheckoutRequestID
  status: "completed" | "failed",
  updateMetadata?: Record<string, any> // Additional data from webhook (e.g., MpesaReceiptNumber)
) {
  try {
    const transactionQuery = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("paymentId", "==", paymentId)
    );
    const snapshot = await getDocs(transactionQuery);

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
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
        dataToUpdate.metadata = { ...currentData.metadata, ...updateMetadata };
      }

      await updateDoc(docRef, dataToUpdate);
      console.log(`Transaction ${docRef.id} (PaymentID: ${paymentId}) status updated to ${status}.`);
      
      // If payment completed successfully, you might trigger further actions here,
      // like granting access to the book, sending a confirmation email, etc.
      // This is especially important if the order creation was deferred until payment confirmation.
      // In the current flow, order creation happens after payment submission by client,
      // so this webhook is mainly for reconciliation and status updates.

    } else {
      console.warn(`Transaction with PaymentID ${paymentId} not found for status update.`);
    }
  } catch (error) {
    console.error("Error updating transaction status:", error);
    throw error; // Re-throw to be handled by the webhook processor if necessary
  }
}
