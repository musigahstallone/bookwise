
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  // Other Firestore imports if needed
} from 'firebase/firestore';
import type { PaymentMethod } from '@/lib/payment-service';

export interface OrderItemInput {
  bookId: string;
  title: string;
  price: number; // This is the USD price from the book catalog for consistency in item data
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
}

export type OrderStatus = "pending" | "completed" | "failed" | "cancelled";

// This interface defines the data expected when creating an order.
export interface CreateOrderData {
    userId: string;
    userEmail?: string; // Can be undefined if not available from auth provider
    items: OrderItemInput[];
    totalAmountUSD: number;   // Base USD total for the order
    regionCode: string;       // Region code used for the order
    currencyCode: string;     // Currency the order was placed/paid in (e.g., KES, USD)
    actualAmountPaid: number; // The amount in currencyCode (e.g., KES 1300, USD 10)
    itemCount: number;
    status: OrderStatus;      // Initial status, typically "pending"
    paymentGatewayId?: string;// e.g., M-Pesa CheckoutRequestID or Stripe PaymentIntentID
    paymentMethod?: PaymentMethod;
}


// Server Action to create an order
export async function handleCreateOrder(
  orderData: CreateOrderData
): Promise<{ success: boolean; message?: string; orderId?: string }> {
  if (!orderData.userId) {
    return { success: false, message: 'User ID missing for order creation.' };
  }
   if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }

  try {
    // Sanitize items to ensure no undefined fields are passed to Firestore
    const cleanItems = orderData.items.map(item => ({
      bookId: item.bookId || 'unknown_book_id',
      title: item.title || 'Unknown Title',
      price: typeof item.price === 'number' ? item.price : 0, // USD price of the book
      coverImageUrl: item.coverImageUrl || 'https://placehold.co/100x100.png?text=No+Cover',
      pdfUrl: item.pdfUrl || '/pdfs/placeholder-book.pdf',
      dataAiHint: item.dataAiHint || 'book', // Default if undefined
    }));

    const orderDocData = {
      userId: orderData.userId,
      userEmail: orderData.userEmail || null, // Convert undefined to null
      items: cleanItems,
      totalAmountUSD: typeof orderData.totalAmountUSD === 'number' ? orderData.totalAmountUSD : 0,
      actualAmountPaid: typeof orderData.actualAmountPaid === 'number' ? orderData.actualAmountPaid : 0,
      orderDate: serverTimestamp(),
      regionCode: orderData.regionCode || 'N/A', // Fallback
      currencyCode: orderData.currencyCode || 'N/A', // Fallback
      itemCount: typeof orderData.itemCount === 'number' ? orderData.itemCount : 0,
      status: orderData.status || 'failed', // Fallback status
      paymentGatewayId: orderData.paymentGatewayId || null, // Convert undefined to null
      paymentMethod: orderData.paymentMethod || null, // Convert undefined to null
      lastUpdatedAt: serverTimestamp(),
    };
    
    // Log the object just before sending to Firestore for debugging
    // console.log("Attempting to create order with data:", JSON.stringify(orderDocData, null, 2));

    const orderRef = await addDoc(collection(db, 'orders'), orderDocData);
    
    console.log(`Order ${orderRef.id} created with status: ${orderData.status}`);
    
    // Revalidate paths that display order information
    revalidatePath('/admin/orders');
    revalidatePath(`/my-orders`);
    revalidatePath(`/orders/${orderRef.id}`); // For the specific order page
    if (orderData.status === "completed") {
        revalidatePath('/admin'); // For dashboard stats if completed immediately
    }

    return { success: true, message: 'Order created successfully.', orderId: orderRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    // Log the data that might have caused the error
    console.error('Data attempted for order creation:', JSON.stringify(orderData, null, 2));
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to create order: ${errorMessage}` };
  }
}

// Server action to update an order's status and related payment details
export async function handleUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentDetails?: { paymentGatewayId?: string; paymentMethod?: PaymentMethod; actualAmountPaid?: number; currencyCode?: string; }
): Promise<{ success: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }
  if (!orderId) {
    return { success: false, message: "Order ID is required to update status." };
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const updateData: any = { 
      status, 
      lastUpdatedAt: serverTimestamp() 
    };

    if (paymentDetails) {
      if (paymentDetails.paymentGatewayId) {
        updateData.paymentGatewayId = paymentDetails.paymentGatewayId;
      }
      if (paymentDetails.paymentMethod) {
        updateData.paymentMethod = paymentDetails.paymentMethod;
      }
      if (typeof paymentDetails.actualAmountPaid === 'number') {
        updateData.actualAmountPaid = paymentDetails.actualAmountPaid;
      }
      if (paymentDetails.currencyCode) {
        updateData.currencyCode = paymentDetails.currencyCode;
      }
    }
    
    await updateDoc(orderDocRef, updateData);

    revalidatePath('/admin/orders');
    revalidatePath(`/my-orders`);
    revalidatePath(`/orders/${orderId}`);
    if (status === "completed") {
      revalidatePath('/admin'); // For dashboard stats
    }
    console.log(`Order ${orderId} status updated to ${status}.`);
    return { success: true, message: `Order ${orderId} status updated to ${status}.` };
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to update order status: ${errorMessage}` };
  }
}
