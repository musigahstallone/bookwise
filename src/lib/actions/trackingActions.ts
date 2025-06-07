
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

    revalidatePath('/admin/downloads'); // For admin to see updated counts
    // No need to revalidate user-specific pages as the download happens client-side after this check
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
  price: number; // Price at the time of purchase
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
}

// Server Action to create an order
export async function handleCreateOrder(
  userId: string,
  items: OrderItemInput[],
  totalAmountUSD: number,
  regionCode: string,
  currencyCode: string,
  itemCount: number
) {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
   if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }

  try {
    const orderRef = await addDoc(collection(db, 'orders'), {
      userId: userId,
      items: items, // Array of enriched book item objects
      totalAmountUSD: totalAmountUSD,
      orderDate: serverTimestamp(),
      regionCode: regionCode,
      currencyCode: currencyCode,
      itemCount: itemCount,
      status: 'completed', // Default status
    });
    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    revalidatePath('/my-orders'); // Revalidate user's order history page
    return { success: true, message: 'Order created successfully.', orderId: orderRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to create order: ${errorMessage}` };
  }
}
