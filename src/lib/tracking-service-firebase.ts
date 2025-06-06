
// src/lib/tracking-service-firebase.ts
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  writeBatch, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import type { MockUserCartSeed, MockBookDownloadSeed, MockOrderSeed } from '@/data/mock-tracking-data';
import { getUserIdByEmail } from './user-service-firebase'; // To find user UIDs

const USERS_COLLECTION = 'users';
const CART_ITEMS_SUBCOLLECTION = 'cartItems';
const BOOK_DOWNLOADS_COLLECTION = 'bookDownloads';
const ORDERS_COLLECTION = 'orders';

export const seedUserCartsToDb = async (cartsToSeed: MockUserCartSeed[]): Promise<{ seededCount: number; skippedUsers: string[]; errors: any[] }> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured for seeding carts.");
  }
  const batch = writeBatch(db);
  let seededCount = 0;
  const errors: any[] = [];
  const skippedUsers: string[] = [];

  for (const userCart of cartsToSeed) {
    const userId = await getUserIdByEmail(userCart.userEmail);
    if (!userId) {
      console.warn(`User with email ${userCart.userEmail} not found. Skipping cart seeding for this user.`);
      skippedUsers.push(userCart.userEmail);
      continue;
    }

    for (const item of userCart.items) {
      try {
        // Use bookId as document ID for cart items to prevent duplicates
        const cartItemRef = doc(db, USERS_COLLECTION, userId, CART_ITEMS_SUBCOLLECTION, item.bookId);
        const cartItemData = {
          ...item, // contains bookId, title, author, price, coverImageUrl, quantity
          addedAt: serverTimestamp(), // Optional: track when item was added
        };
        batch.set(cartItemRef, cartItemData);
        seededCount++;
      } catch (error) {
        console.error(`Error preparing cart item "${item.title}" for user ${userCart.userEmail} for batch seed:`, error);
        errors.push({ userEmail: userCart.userEmail, itemTitle: item.title, error });
      }
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully seeded/updated ${seededCount} cart items.`);
    return { seededCount, skippedUsers, errors };
  } catch (error) {
    console.error("Error committing cart seed batch to Firestore:", error);
    errors.push({ general: "Batch commit failed for carts", error });
    return { seededCount: 0, skippedUsers, errors };
  }
};


export const seedBookDownloadsToDb = async (downloadsToSeed: MockBookDownloadSeed[]): Promise<{ seededCount: number; skippedUsers: string[]; errors: any[] }> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured for seeding downloads.");
  }
  const batch = writeBatch(db);
  let seededCount = 0;
  const errors: any[] = [];
  const skippedUsers: string[] = [];

  for (const download of downloadsToSeed) {
    const userId = await getUserIdByEmail(download.userEmail);
    if (!userId) {
      console.warn(`User with email ${download.userEmail} not found. Skipping download seeding for this record.`);
      skippedUsers.push(download.userEmail);
      continue;
    }
    try {
      const downloadRef = doc(collection(db, BOOK_DOWNLOADS_COLLECTION)); // Auto-generate ID
      const downloadData = {
        userId,
        bookId: download.bookId,
        downloadedAt: Timestamp.fromDate(download.downloadedAt),
      };
      batch.set(downloadRef, downloadData);
      seededCount++;
    } catch (error) {
      console.error(`Error preparing download for book ${download.bookId} by user ${download.userEmail} for batch seed:`, error);
      errors.push({ userEmail: download.userEmail, bookId: download.bookId, error });
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully seeded ${seededCount} book download records.`);
    return { seededCount, skippedUsers, errors };
  } catch (error) {
    console.error("Error committing download seed batch to Firestore:", error);
    errors.push({ general: "Batch commit failed for downloads", error });
    return { seededCount: 0, skippedUsers, errors };
  }
};


export const seedOrdersToDb = async (ordersToSeed: MockOrderSeed[]): Promise<{ seededCount: number; skippedUsers: string[]; errors: any[] }> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured for seeding orders.");
  }
  const batch = writeBatch(db);
  let seededCount = 0;
  const errors: any[] = [];
  const skippedUsers: string[] = [];

  for (const order of ordersToSeed) {
    const userId = await getUserIdByEmail(order.userEmail);
    if (!userId) {
      console.warn(`User with email ${order.userEmail} not found. Skipping order seeding for this record.`);
      skippedUsers.push(order.userEmail);
      continue;
    }
    try {
      const orderRef = doc(collection(db, ORDERS_COLLECTION)); // Auto-generate ID
      const orderData = {
        userId,
        items: order.items, // Array of simplified book objects
        totalAmountUSD: order.totalAmountUSD,
        orderDate: Timestamp.fromDate(order.orderDate),
        regionCode: order.regionCode,
        currencyCode: order.currencyCode,
        itemCount: order.itemCount,
      };
      batch.set(orderRef, orderData);
      seededCount++;
    } catch (error) {
      console.error(`Error preparing order for user ${order.userEmail} for batch seed:`, error);
      errors.push({ userEmail: order.userEmail, error });
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully seeded ${seededCount} order records.`);
    return { seededCount, skippedUsers, errors };
  } catch (error) {
    console.error("Error committing order seed batch to Firestore:", error);
    errors.push({ general: "Batch commit failed for orders", error });
    return { seededCount: 0, skippedUsers, errors };
  }
};
