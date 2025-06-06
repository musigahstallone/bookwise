
// src/lib/stats-service-firebase.ts
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  getCountFromServer,
  DocumentData,
} from 'firebase/firestore';
import type { User } from '@/data/users'; 
import type { Book } from '@/data/books'; 

const USERS_COLLECTION = 'users';
const BOOK_DOWNLOADS_COLLECTION = 'bookDownloads';
const ORDERS_COLLECTION = 'orders';

export const getDashboardStats = async (): Promise<{
  newUsersToday: number;
  totalDownloads: number;
  totalSalesAmount: number;
  totalOrders: number;
}> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning zero stats.");
    return { newUsersToday: 0, totalDownloads: 0, totalSalesAmount: 0, totalOrders: 0 };
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const startOfDayTimestamp = Timestamp.fromDate(startOfDay);
    const endOfDayTimestamp = Timestamp.fromDate(endOfDay);

    // New Users Today
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('createdAt', '>=', startOfDayTimestamp),
      where('createdAt', '<', endOfDayTimestamp)
    );
    const newUsersSnapshot = await getCountFromServer(usersQuery);
    const newUsersToday = newUsersSnapshot.data().count;

    // Total Downloads
    const downloadsSnapshot = await getCountFromServer(collection(db, BOOK_DOWNLOADS_COLLECTION));
    const totalDownloads = downloadsSnapshot.data().count;

    // Sales Overview
    const ordersSnapshot = await getDocs(collection(db, ORDERS_COLLECTION));
    const totalOrders = ordersSnapshot.size;
    let totalSalesAmount = 0;
    ordersSnapshot.forEach(doc => {
      totalSalesAmount += (doc.data().totalAmountUSD || 0) as number;
    });

    return { newUsersToday, totalDownloads, totalSalesAmount, totalOrders };
  } catch (error) {
    console.error("Error fetching dashboard stats from Firestore:", error);
    // Return zero stats on error to prevent dashboard from breaking
    return { newUsersToday: 0, totalDownloads: 0, totalSalesAmount: 0, totalOrders: 0 };
  }
};
