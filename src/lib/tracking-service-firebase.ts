
// src/lib/tracking-service-firebase.ts
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  writeBatch, 
  Timestamp,
  serverTimestamp,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
// Mock data import removed
// import type { MockUserCartSeed, MockBookDownloadSeed, MockOrderSeed } from '@/data/mock-tracking-data';
import { getUserIdByEmail, getUserDocumentFromDb } from './user-service-firebase';
import { getBookByIdFromDb } from './book-service-firebase';
import type { User } from '@/data/users';
import type { Book } from '@/data/books';
import type { OrderItemInput } from './actions/trackingActions';


const USERS_COLLECTION = 'users';
const CART_ITEMS_SUBCOLLECTION = 'cartItems';
const BOOK_DOWNLOADS_COLLECTION = 'bookDownloads';
const ORDERS_COLLECTION = 'orders';
const BOOKS_COLLECTION = 'books';


// Seeding functions removed as per request
// export const seedUserCartsToDb = async ( ... ) => { ... };
// export const seedBookDownloadsToDb = async ( ... ) => { ... };
// export const seedOrdersToDb = async ( ... ) => { ... };


export interface OrderWithUserDetails {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  items: OrderItemInput[];
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
