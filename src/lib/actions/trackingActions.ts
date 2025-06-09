
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getCountFromServer,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import type { PaymentMethod } from '@/lib/payment-service';


const BOOK_DOWNLOADS_COLLECTION = 'bookDownloads';
const MAX_DAILY_DOWNLOADS_PER_BOOK = 2;
const MAX_DAILY_TOTAL_DOWNLOADS = 5;

export async function handleRecordDownload(bookId: string, userId: string) {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const startOfDayTimestamp = Timestamp.fromDate(startOfDay);
    const endOfDayTimestamp = Timestamp.fromDate(endOfDay);

    // Check per-book daily limit
    const perBookQuery = query(
      collection(db, BOOK_DOWNLOADS_COLLECTION),
      where('userId', '==', userId),
      where('bookId', '==', bookId),
      where('downloadedAt', '>=', startOfDayTimestamp),
      where('downloadedAt', '<', endOfDayTimestamp)
    );
    const perBookSnapshot = await getCountFromServer(perBookQuery);
    if (perBookSnapshot.data().count >= MAX_DAILY_DOWNLOADS_PER_BOOK) {
      return { success: false, message: `You have reached the download limit for this book today (${MAX_DAILY_DOWNLOADS_PER_BOOK} times).` };
    }

    // Check total daily downloads limit
    const totalDownloadsQuery = query(
      collection(db, BOOK_DOWNLOADS_COLLECTION),
      where('userId', '==', userId),
      where('downloadedAt', '>=', startOfDayTimestamp),
      where('downloadedAt', '<', endOfDayTimestamp)
    );
    const totalDownloadsSnapshot = await getCountFromServer(totalDownloadsQuery);
    if (totalDownloadsSnapshot.data().count >= MAX_DAILY_TOTAL_DOWNLOADS) {
      return { success: false, message: `You have reached your total daily download limit (${MAX_DAILY_TOTAL_DOWNLOADS} downloads).` };
    }

    // If limits not reached, record the download
    await addDoc(collection(db, BOOK_DOWNLOADS_COLLECTION), {
      userId: userId,
      bookId: bookId,
      downloadedAt: serverTimestamp(),
    });

    revalidatePath('/admin/downloads');
    return { success: true, message: 'Download recorded.' };
  } catch (error) {
    console.error('Error recording download:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to process download: ${errorMessage}` };
  }
}

export interface OrderItemInput {
  bookId: string;
  title: string;
  price: number; // Price at the time of purchase (e.g. KES for M-Pesa, USD for Stripe based on order's currency)
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
}

export type OrderStatus = "pending" | "completed" | "failed" | "cancelled";

export interface CreateOrderData {
    userId: string;
    items: OrderItemInput[];
    totalAmountUSD: number; // Base USD total for consistent internal value
    regionCode: string;     // Region used for the order
    currencyCode: string;   // Currency the order was placed/paid in (e.g., KES, USD)
    actualAmountPaid: number; // The amount in currencyCode (e.g., 1300 KES, 10 USD)
    itemCount: number;
    status: OrderStatus;
    paymentGatewayId?: string; // e.g., M-Pesa CheckoutRequestID or Stripe PaymentIntentID
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
    const cleanItems = orderData.items.map(item => ({
        bookId: item.bookId,
        title: item.title,
        price: item.price, // Should be price in order's currency
        coverImageUrl: item.coverImageUrl,
        pdfUrl: item.pdfUrl,
        dataAiHint: item.dataAiHint || 'book',
    }));


    const orderDocData = {
      userId: orderData.userId,
      items: cleanItems,
      totalAmountUSD: orderData.totalAmountUSD,
      actualAmountPaid: orderData.actualAmountPaid,
      orderDate: serverTimestamp(),
      regionCode: orderData.regionCode,
      currencyCode: orderData.currencyCode,
      itemCount: orderData.itemCount,
      status: orderData.status, // "pending", "completed", "failed"
      paymentGatewayId: orderData.paymentGatewayId || null,
      paymentMethod: orderData.paymentMethod || null,
      lastUpdatedAt: serverTimestamp(),
    };
    
    const orderRef = await addDoc(collection(db, 'orders'), orderDocData);
    
    console.log(`Order ${orderRef.id} created with status: ${orderData.status}`);
    
    revalidatePath('/admin/orders');
    revalidatePath(`/my-orders`);
    revalidatePath(`/orders/${orderRef.id}`);
    if (orderData.status === "completed") {
        revalidatePath('/admin'); // For dashboard stats
    }

    return { success: true, message: 'Order created successfully.', orderId: orderRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to create order: ${errorMessage}` };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentDetails?: { paymentGatewayId?: string; paymentMethod?: PaymentMethod }) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const updateData: any = { status, lastUpdatedAt: serverTimestamp() };
    if (paymentDetails?.paymentGatewayId) {
      updateData.paymentGatewayId = paymentDetails.paymentGatewayId;
    }
    if (paymentDetails?.paymentMethod) {
      updateData.paymentMethod = paymentDetails.paymentMethod;
    }
    await updateDoc(orderDocRef, updateData);

    revalidatePath('/admin/orders');
    revalidatePath(`/my-orders`);
    revalidatePath(`/orders/${orderId}`);
    if (status === "completed") {
      revalidatePath('/admin');
    }
    return { success: true, message: `Order ${orderId} status updated to ${status}.` };
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
    return { success: false, message: 'Failed to update order status.' };
  }
}


    