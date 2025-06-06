
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
} from 'firebase/firestore';

// Server Action to record a book download
export async function handleRecordDownload(bookId: string, userId: string) {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }

  try {
    await addDoc(collection(db, 'bookDownloads'), {
      userId: userId,
      bookId: bookId,
      downloadedAt: serverTimestamp(),
    });
    revalidatePath('/admin'); 
    revalidatePath('/admin/downloads');
    // Optionally revalidate user-specific download history if that page exists
    return { success: true, message: 'Download recorded.' };
  } catch (error) {
    console.error('Error recording download:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to record download: ${errorMessage}` };
  }
}

export interface OrderItemInput {
  bookId: string;
  title: string;
  price: number; // Price at the time of purchase
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
  // Quantity is implicitly 1 for now
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
