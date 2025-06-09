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

export type PaymentMethod = "stripe" | "mpesa" | "mock";
// after checkout I need the app to redirect to the success page with the bookId and paymentId
export interface PaymentDetails {
  amount: number;
  currency: string;
  userId: string;
  bookId: string;
  email?: string;
  phoneNumber?: string;
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  paymentId?: string;
  clientSecret?: string; // For Stripe
  checkoutUrl?: string; // For redirect-based payments
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
      throw new Error("Stripe configuration missing");
    }

    const stripeResponse = await createStripePaymentIntent(
      {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      {
        amount: details.amount,
        currency: details.currency.toLowerCase(),
        metadata: { userId: details.userId, bookId: details.bookId },
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
    return { success: false, error: "Stripe payment failed" };
  }
}

// Handle M-Pesa Payment
async function handleMpesaPayment(
  details: PaymentDetails
): Promise<PaymentResponse> {
  try {
    if (!process.env.MPESA_CONSUMER_KEY) {
      throw new Error("M-Pesa configuration missing");
    }

    if (!details.phoneNumber) {
      throw new Error("Phone number is required for M-Pesa payments");
    }

    const mpesaResponse = await initiateStkPush(
      {
        consumerKey: process.env.MPESA_CONSUMER_KEY,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
        shortCode: process.env.MPESA_SHORTCODE!,
        passkey: process.env.MPESA_PASSKEY!,
        callbackUrl: process.env.MPESA_CALLBACK_URL!,
        environment: process.env.MPESA_ENVIRONMENT as "sandbox" | "production",
      },
      {
        phoneNumber: details.phoneNumber,
        amount: details.amount,
        accountReference: details.bookId,
        transactionDesc: `BookWise purchase: ${details.bookId}`,
      }
    );

    await recordTransaction({
      userId: details.userId,
      bookId: details.bookId,
      amount: details.amount,
      currency: "KES",
      paymentMethod: "mpesa",
      status: "pending",
      paymentId: mpesaResponse.CheckoutRequestID,
      createdAt: new Date(),
      metadata: { merchantRequestId: mpesaResponse.MerchantRequestID },
    });

    return {
      success: true,
      paymentId: mpesaResponse.CheckoutRequestID,
    };
  } catch (error) {
    console.error("M-Pesa payment error:", error);
    return { success: false, error: "M-Pesa payment failed" };
  }
}

// Handle Mock Payment (for testing)
async function handleMockPayment(
  details: PaymentDetails
): Promise<PaymentResponse> {
  try {
    const mockPaymentId = `mock_${Date.now()}`;

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
      checkoutUrl: `/purchase-success/${details.bookId}?mock=true`,
    };
  } catch (error) {
    console.error("Mock payment error:", error);
    return { success: false, error: "Mock payment failed" };
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
      return { success: false, error: "Invalid payment method" };
  }
}

// Update transaction status
export async function updateTransactionStatus(
  paymentId: string,
  status: "completed" | "failed",
  metadata?: Record<string, any>
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

      const updateData: {
        status: "completed" | "failed";
        metadata?: Record<string, any>;
      } = {
        status,
        ...(metadata && {
          metadata: { ...currentData.metadata, ...metadata },
        }),
      };

      await updateDoc(docRef, updateData);
    }
  } catch (error) {
    console.error("Error updating transaction status:", error);
    throw error;
  }
}
/*export const updateUserInDb = async (uid: string, updates: Partial<Pick<User, 'name' | 'role'>>): Promise<User | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  // Filter out undefined values from updates, Firestore doesn't like them
  const validUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
  
  if (Object.keys(validUpdates).length === 0) {
    // No actual updates to perform, return existing user data
    return getUserDocumentFromDb(uid);
  }

  await updateDoc(userDocRef, validUpdates);
  const updatedDoc = await getDoc(userDocRef);
  if (updatedDoc.exists()) {
    const userData = updatedDoc.data();
     if (userData.createdAt && userData.createdAt instanceof Timestamp) {
        userData.createdAt = userData.createdAt.toDate();
      }
    return { id: updatedDoc.id, ...userData } as User;
  }
  return null;
};
*/
