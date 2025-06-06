
// src/lib/stats-service-firebase.ts
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  getCountFromServer,
} from 'firebase/firestore';
// Assuming User and Book types are not strictly needed here for counts,
// but if they were, you'd import them:
// import type { User } from '@/data/users'; 
// import type { Book } from '@/data/books'; 

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
    let newUsersToday = 0;
    try {
      const usersQuery = query(
        collection(db, USERS_COLLECTION),
        where('createdAt', '>=', startOfDayTimestamp),
        where('createdAt', '<', endOfDayTimestamp)
      );
      const newUsersSnapshot = await getCountFromServer(usersQuery);
      newUsersToday = newUsersSnapshot.data().count;
    } catch (userError) {
      console.error("Error fetching new users count:", userError);
      // Continue with other stats, newUsersToday will remain 0
    }
    

    // Total Downloads
    let totalDownloads = 0;
    try {
      const downloadsSnapshot = await getCountFromServer(collection(db, BOOK_DOWNLOADS_COLLECTION));
      totalDownloads = downloadsSnapshot.data().count;
    } catch (downloadError) {
        console.error("Error fetching total downloads count:", downloadError);
        // Continue, totalDownloads will remain 0
    }


    // Sales Overview
    let totalOrders = 0;
    let totalSalesAmount = 0;
    try {
      const ordersSnapshot = await getDocs(collection(db, ORDERS_COLLECTION));
      totalOrders = ordersSnapshot.size;
      ordersSnapshot.forEach(doc => {
        totalSalesAmount += (doc.data().totalAmountUSD || 0) as number;
      });
    } catch (orderError) {
        console.error("Error fetching orders for sales overview:", orderError);
        // Continue, sales stats will remain 0
    }
    

    return { newUsersToday, totalDownloads, totalSalesAmount, totalOrders };
  } catch (error) {
    console.error("General error fetching dashboard stats from Firestore:", error);
    // Return zero stats on error to prevent dashboard from breaking
    return { newUsersToday: 0, totalDownloads: 0, totalSalesAmount: 0, totalOrders: 0 };
  }
};
