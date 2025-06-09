
// src/lib/tracking-service-firebase.ts
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  Timestamp,
  getDocs,
  getDoc, // Added for fetching single order
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { getUserDocumentFromDb } from './user-service-firebase';
import { getBookByIdFromDb } from './book-service-firebase';
import type { OrderItemInput, OrderStatus } from './actions/trackingActions';


export interface OrderWithUserDetails {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  items: OrderItemInput[];
  totalAmountUSD: number;
  actualAmountPaid: number; // Amount in the currency the order was paid in
  orderDate: Date; // Converted from Timestamp
  regionCode: string;
  currencyCode: string;
  itemCount: number;
  status: OrderStatus;
  paymentGatewayId?: string;
  paymentMethod?: string;
  lastUpdatedAt: Date;
}

const ORDERS_COLLECTION = "orders";

export const getOrderByIdFromDb = async (orderId: string, userId?: string): Promise<OrderWithUserDetails | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning null for order fetch.");
    return null;
  }
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const orderDocSnap = await getDoc(orderDocRef);

    if (orderDocSnap.exists()) {
      const orderData = orderDocSnap.data();
      // Security check: if userId is provided, ensure it matches the order's userId
      if (userId && orderData.userId !== userId) {
        console.warn(`User ${userId} attempted to fetch order ${orderId} belonging to another user.`);
        return null; // Or throw an authorization error
      }

      const user = await getUserDocumentFromDb(orderData.userId);

      return {
        id: orderDocSnap.id,
        userId: orderData.userId,
        userName: user?.name,
        userEmail: user?.email,
        items: orderData.items as OrderItemInput[],
        totalAmountUSD: orderData.totalAmountUSD,
        actualAmountPaid: orderData.actualAmountPaid,
        orderDate: (orderData.orderDate as Timestamp).toDate(),
        lastUpdatedAt: (orderData.lastUpdatedAt as Timestamp)?.toDate() || (orderData.orderDate as Timestamp).toDate(),
        regionCode: orderData.regionCode,
        currencyCode: orderData.currencyCode,
        itemCount: orderData.itemCount,
        status: orderData.status as OrderStatus,
        paymentGatewayId: orderData.paymentGatewayId,
        paymentMethod: orderData.paymentMethod,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching order with ID ${orderId} from Firestore:`, error);
    return null;
  }
};


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
        actualAmountPaid: orderData.actualAmountPaid,
        orderDate: (orderData.orderDate as Timestamp).toDate(),
        lastUpdatedAt: (orderData.lastUpdatedAt as Timestamp)?.toDate() || (orderData.orderDate as Timestamp).toDate(),
        regionCode: orderData.regionCode,
        currencyCode: orderData.currencyCode,
        itemCount: orderData.itemCount,
        status: orderData.status as OrderStatus,
        paymentGatewayId: orderData.paymentGatewayId,
        paymentMethod: orderData.paymentMethod,
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
    return [];
  }
  if (!userId) {
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
      return {
        id: orderDoc.id,
        userId: orderData.userId,
        items: orderData.items as OrderItemInput[],
        totalAmountUSD: orderData.totalAmountUSD,
        actualAmountPaid: orderData.actualAmountPaid,
        orderDate: (orderData.orderDate as Timestamp).toDate(),
        lastUpdatedAt: (orderData.lastUpdatedAt as Timestamp)?.toDate() || (orderData.orderDate as Timestamp).toDate(),
        regionCode: orderData.regionCode,
        currencyCode: orderData.currencyCode,
        itemCount: orderData.itemCount,
        status: orderData.status as OrderStatus,
        paymentGatewayId: orderData.paymentGatewayId,
        paymentMethod: orderData.paymentMethod,
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


    