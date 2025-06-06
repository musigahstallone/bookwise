
// src/lib/tracking-service-firebase.ts
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  Timestamp,
  getDocs,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { getUserDocumentFromDb } from './user-service-firebase';
import { getBookByIdFromDb } from './book-service-firebase';
import type { OrderItemInput } from './actions/trackingActions';


const BOOK_DOWNLOADS_COLLECTION = 'bookDownloads';
const ORDERS_COLLECTION = 'orders';


export interface OrderWithUserDetails {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  items: OrderItemInput[]; // Now uses the enriched OrderItemInput
  totalAmountUSD: number;
  orderDate: Date; // Converted from Timestamp
  regionCode: string;
  currencyCode: string;
  itemCount: number;
  status: string;
}

export const getAllOrdersWithUserDetailsFromDb = async (): Promise<OrderWithUserDetails[]> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning empty array for orders.");
    return [];
  }
  try {
    const ordersQuery = query(collection(db, ORDERS_COLLECTION), orderBy('orderDate', 'desc'));
    const ordersSnapshot = await getDocs(ordersQuery);
    const ordersList: OrderWithUserDetails[] = [];

    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      const user = await getUserDocumentFromDb(orderData.userId);
      
      ordersList.push({
        id: orderDoc.id,
        userId: orderData.userId,
        userName: user?.name,
        userEmail: user?.email,
        items: orderData.items as OrderItemInput[],
        totalAmountUSD: orderData.totalAmountUSD,
        orderDate: (orderData.orderDate as Timestamp).toDate(),
        regionCode: orderData.regionCode,
        currencyCode: orderData.currencyCode,
        itemCount: orderData.itemCount,
        status: orderData.status || 'completed',
      });
    }
    return ordersList;
  } catch (error) {
    console.error("Error fetching all orders from Firestore:", error);
    return [];
  }
};

export const getOrdersByUserIdFromDb = async (userId: string): Promise<OrderWithUserDetails[]> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning empty array for user orders.");
    return [];
  }
  if (!userId) {
    console.warn("User ID not provided for fetching orders. Returning empty array.");
    return [];
  }

  try {
    const ordersQuery = query(
      collection(db, ORDERS_COLLECTION),
      where("userId", "==", userId),
      orderBy('orderDate', 'desc')
    );
    const ordersSnapshot = await getDocs(ordersQuery);
    const ordersList: OrderWithUserDetails[] = ordersSnapshot.docs.map(orderDoc => {
      const orderData = orderDoc.data();
      // User details (name, email) are not fetched here to keep it simpler for user-specific page
      // If needed, they could be fetched, or assumed to be available from AuthContext client-side
      return {
        id: orderDoc.id,
        userId: orderData.userId,
        // userName and userEmail could be omitted or fetched if necessary
        items: orderData.items as OrderItemInput[],
        totalAmountUSD: orderData.totalAmountUSD,
        orderDate: (orderData.orderDate as Timestamp).toDate(),
        regionCode: orderData.regionCode,
        currencyCode: orderData.currencyCode,
        itemCount: orderData.itemCount,
        status: orderData.status || 'completed',
      };
    });
    return ordersList;
  } catch (error) {
    console.error(`Error fetching orders for user ${userId} from Firestore:`, error);
    return [];
  }
};


export interface DownloadWithDetails {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  bookId: string;
  bookTitle?: string;
  downloadedAt: Date; // Converted from Timestamp
}

export const getAllDownloadsWithDetailsFromDb = async (): Promise<DownloadWithDetails[]> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning empty array for downloads.");
    return [];
  }
  try {
    const downloadsQuery = query(collection(db, BOOK_DOWNLOADS_COLLECTION), orderBy('downloadedAt', 'desc'));
    const downloadsSnapshot = await getDocs(downloadsQuery);
    const downloadsList: DownloadWithDetails[] = [];

    for (const downloadDoc of downloadsSnapshot.docs) {
      const downloadData = downloadDoc.data();
      const user = await getUserDocumentFromDb(downloadData.userId);
      const book = await getBookByIdFromDb(downloadData.bookId);
      
      downloadsList.push({
        id: downloadDoc.id,
        userId: downloadData.userId,
        userName: user?.name,
        userEmail: user?.email,
        bookId: downloadData.bookId,
        bookTitle: book?.title,
        downloadedAt: (downloadData.downloadedAt as Timestamp).toDate(),
      });
    }
    return downloadsList;
  } catch (error) {
    console.error("Error fetching all downloads from Firestore:", error);
    return [];
  }
};
