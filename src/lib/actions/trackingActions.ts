
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
  price: number; // Price at the time of purchase (USD or KES, matching order currency)
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
}

export interface CreateOrderData {
    userId: string;
    items: OrderItemInput[];
    totalAmountUSD: number; // Always store a USD equivalent for consistent reporting if needed
    regionCode: string;
    currencyCode: string; // The currency the order was placed in (e.g. KES, USD)
    itemCount: number;
    status: "pending" | "completed" | "failed"; // Status of the order
    paymentGatewayId?: string; // e.g., M-Pesa CheckoutRequestID or Stripe PaymentIntentID
    paymentMethod?: PaymentMethod;
}


// Server Action to create an order - now typically called by server-side logic (webhook or successful mock)
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
    // Ensure items are correctly structured for Firestore (e.g., no undefined values for optional fields if Firestore rules disallow)
    const cleanItems = orderData.items.map(item => ({
        bookId: item.bookId,
        title: item.title,
        price: item.price, // This should be the price in the order's currency (e.g. KES for M-Pesa)
        coverImageUrl: item.coverImageUrl,
        pdfUrl: item.pdfUrl,
        dataAiHint: item.dataAiHint || 'book',
    }));


    const orderRef = await addDoc(collection(db, 'orders'), {
      userId: orderData.userId,
      items: cleanItems, 
      totalAmountUSD: orderData.totalAmountUSD, 
      orderDate: serverTimestamp(),
      regionCode: orderData.regionCode,
      currencyCode: orderData.currencyCode, 
      itemCount: orderData.itemCount,
      status: orderData.status,
      paymentGatewayId: orderData.paymentGatewayId || null, 
      paymentMethod: orderData.paymentMethod || null, 
    });
    
    console.log(`Order ${orderRef.id} created with status: ${orderData.status}`);
    
    revalidatePath('/admin/orders');
    revalidatePath(`/my-orders`); 
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
