
'use server';

import { revalidatePath } from 'next/cache';
import { db, auth as firebaseAuthService } from '@/lib/firebase'; // Assuming auth is exported for getting current user server-side if needed
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import {
  mockUserCartSeedData,
  mockBookDownloadSeedData,
  mockOrderSeedData,
} from '@/data/mock-tracking-data';
import {
  seedUserCartsToDb,
  seedBookDownloadsToDb,
  seedOrdersToDb,
} from '@/lib/tracking-service-firebase';

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
    revalidatePath('/admin'); // Revalidate admin dashboard to update stats
    return { success: true, message: 'Download recorded.' };
  } catch (error) {
    console.error('Error recording download:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to record download: ${errorMessage}` };
  }
}

// Server Action to create an order
export async function handleCreateOrder(
  userId: string, 
  items: any[], // Consider using a more specific type like CartItem[] 
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
      items: items, // Array of book objects from the cart
      totalAmountUSD: totalAmountUSD,
      orderDate: serverTimestamp(),
      regionCode: regionCode,
      currencyCode: currencyCode,
      itemCount: itemCount,
    });
    revalidatePath('/admin'); // Revalidate admin dashboard
    return { success: true, message: 'Order created successfully.', orderId: orderRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to create order: ${errorMessage}` };
  }
}


// --- Seeding Actions ---

export async function handleSeedUserCarts() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const result = await seedUserCartsToDb(mockUserCartSeedData);
    let message = `Seeded ${result.seededCount} cart items.`;
    if (result.skippedUsers.length > 0) {
      message += ` Skipped users (not found by email): ${result.skippedUsers.join(', ')}.`;
    }
    if (result.errors.length > 0) {
      console.error("Errors during cart seeding:", result.errors);
      return { success: false, message: `${message} Encountered errors. Check server logs.` };
    }
    revalidatePath('/admin'); // For potential stats update
    return { success: true, message };
  } catch (error) {
    console.error('Error seeding user carts:', error);
    return { success: false, message: `Failed to seed user carts: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function handleSeedBookDownloads() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const result = await seedBookDownloadsToDb(mockBookDownloadSeedData);
    let message = `Seeded ${result.seededCount} book download records.`;
     if (result.skippedUsers.length > 0) {
      message += ` Skipped users (not found by email): ${result.skippedUsers.join(', ')}.`;
    }
    if (result.errors.length > 0) {
      console.error("Errors during download seeding:", result.errors);
      return { success: false, message: `${message} Encountered errors. Check server logs.` };
    }
    revalidatePath('/admin');
    return { success: true, message };
  } catch (error) {
    console.error('Error seeding book downloads:', error);
    return { success: false, message: `Failed to seed book downloads: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function handleSeedOrders() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const result = await seedOrdersToDb(mockOrderSeedData);
    let message = `Seeded ${result.seededCount} order records.`;
    if (result.skippedUsers.length > 0) {
      message += ` Skipped users (not found by email): ${result.skippedUsers.join(', ')}.`;
    }
    if (result.errors.length > 0) {
      console.error("Errors during order seeding:", result.errors);
      return { success: false, message: `${message} Encountered errors. Check server logs.` };
    }
    revalidatePath('/admin');
    return { success: true, message };
  } catch (error) {
    console.error('Error seeding orders:', error);
    return { success: false, message: `Failed to seed orders: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
