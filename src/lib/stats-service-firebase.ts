
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

  let newUsersToday = 0;
  let totalDownloads = 0;
  let totalSalesAmount = 0;
  let totalOrders = 0;

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const startOfDayTimestamp = Timestamp.fromDate(startOfDay);
    const endOfDayTimestamp = Timestamp.fromDate(endOfDay);

    // New Users Today
    try {
      const usersQuery = query(
        collection(db, USERS_COLLECTION),
        where('createdAt', '>=', startOfDayTimestamp),
        where('createdAt', '<', endOfDayTimestamp)
      );
      const newUsersSnapshot = await getCountFromServer(usersQuery);
      newUsersToday = newUsersSnapshot.data().count;
    } catch (userError) {
      console.error("Admin Dashboard: Error fetching new users count. Returning 0. Details:", userError);
      // newUsersToday remains 0
    }
    

    // Total Downloads
    try {
      const downloadsSnapshot = await getCountFromServer(collection(db, BOOK_DOWNLOADS_COLLECTION));
      totalDownloads = downloadsSnapshot.data().count;
    } catch (downloadError) {
        console.error("Admin Dashboard: Error fetching total downloads count. Returning 0. Details:", downloadError);
        // totalDownloads remains 0
    }


    // Sales Overview
    try {
      const ordersSnapshot = await getDocs(collection(db, ORDERS_COLLECTION));
      totalOrders = ordersSnapshot.size;
      ordersSnapshot.forEach(doc => {
        const sales = doc.data().totalAmountUSD;
        if (typeof sales === 'number') {
            totalSalesAmount += sales;
        } else {
            console.warn(`Order ${doc.id} has non-numeric totalAmountUSD: ${sales}`);
        }
      });
    } catch (orderError) {
        console.error("Admin Dashboard: Error fetching orders for sales overview. Returning 0 for sales/orders. Details:", orderError);
        // totalOrders and totalSalesAmount remain 0
    }
    

    return { newUsersToday, totalDownloads, totalSalesAmount, totalOrders };
  } catch (error) {
    console.error("Admin Dashboard: General error fetching dashboard stats from Firestore. Details:", error);
    // Return zero stats on error to prevent dashboard from breaking
    return { newUsersToday: 0, totalDownloads: 0, totalSalesAmount: 0, totalOrders: 0 };
  }
};
