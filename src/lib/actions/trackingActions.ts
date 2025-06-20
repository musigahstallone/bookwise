
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  writeBatch,
  limit,
  getDoc,
} from 'firebase/firestore';
import type { PaymentMethod } from '@/lib/payment-service';
import { getRegionByCode, defaultRegion } from '@/data/regionData';

export interface OrderItemInput {
  bookId: string;
  title: string;
  price: number;
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
}

export type OrderStatus = "pending" | "completed" | "failed" | "cancelled";

export interface CreateOrderData {
    userId: string;
    userEmail?: string | null;
    items: OrderItemInput[];
    totalAmountUSD: number;
    regionCode: string;
    currencyCode: string;
    actualAmountPaid: number;
    itemCount: number;
    status: OrderStatus;
    paymentGatewayId?: string | null;
    paymentMethod?: PaymentMethod | null;
    orderId?: string;
}


export async function handleCreateOrder(
  orderData: CreateOrderData
): Promise<{ success: boolean; message?: string; orderId?: string }> {
  if (!orderData.userId) {
    return { success: false, message: 'User ID missing for order creation.' };
  }
   if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }

  try {
    const cleanItems = orderData.items.map(item => ({
      bookId: item.bookId || 'unknown_book_id',
      title: item.title || 'Unknown Title',
      price: typeof item.price === 'number' ? item.price : 0,
      coverImageUrl: item.coverImageUrl || 'https://placehold.co/100x100.png?text=No+Cover',
      pdfUrl: item.pdfUrl || '/pdfs/placeholder-book.pdf',
      dataAiHint: item.dataAiHint || 'book',
    }));

    const orderDocData = {
      userId: orderData.userId,
      userEmail: orderData.userEmail || null,
      items: cleanItems,
      totalAmountUSD: typeof orderData.totalAmountUSD === 'number' ? orderData.totalAmountUSD : 0,
      actualAmountPaid: typeof orderData.actualAmountPaid === 'number' ? orderData.actualAmountPaid : 0,
      orderDate: serverTimestamp(),
      regionCode: orderData.regionCode || defaultRegion.code,
      currencyCode: orderData.currencyCode || defaultRegion.currencyCode,
      itemCount: typeof orderData.itemCount === 'number' ? orderData.itemCount : 0,
      status: orderData.status, // Status is now passed in, typically 'pending' or 'completed' for mock
      paymentGatewayId: orderData.paymentGatewayId || null,
      paymentMethod: orderData.paymentMethod || null,
      lastUpdatedAt: serverTimestamp(),
    };
    
    let orderRef;
    if (orderData.orderId) {
        orderRef = doc(db, 'orders', orderData.orderId);
        await updateDoc(orderRef, orderDocData);
        console.log(`Order ${orderData.orderId} details updated with status: ${orderData.status}`);
    } else {
        orderRef = await addDoc(collection(db, 'orders'), orderDocData);
        console.log(`New order ${orderRef.id} created with status: ${orderData.status}`);
    }
    
    const finalOrderId = orderData.orderId || orderRef.id;

    revalidatePath('/admin/orders');
    revalidatePath(`/my-orders`);
    revalidatePath(`/orders/${finalOrderId}`);
    if (orderData.status === "completed") {
        revalidatePath('/admin'); 
    }

    return { success: true, message: 'Order processed successfully.', orderId: finalOrderId };
  } catch (error) {
    console.error('Error processing order:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to process order: ${errorMessage}` };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentDetails?: { paymentGatewayId?: string; paymentMethod?: PaymentMethod; actualAmountPaid?: number; currencyCode?: string; }
): Promise<{ success: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }
  if (!orderId) {
    return { success: false, message: "Order ID is required to update status." };
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const updateData: any = { 
      status, 
      lastUpdatedAt: serverTimestamp() 
    };

    if (paymentDetails) {
      if (paymentDetails.paymentGatewayId !== undefined) {
        updateData.paymentGatewayId = paymentDetails.paymentGatewayId;
      }
      if (paymentDetails.paymentMethod) {
        updateData.paymentMethod = paymentDetails.paymentMethod;
      }
      if (typeof paymentDetails.actualAmountPaid === 'number') {
        updateData.actualAmountPaid = paymentDetails.actualAmountPaid;
      }
      if (paymentDetails.currencyCode) {
        updateData.currencyCode = paymentDetails.currencyCode;
      }
    }
    
    await updateDoc(orderDocRef, updateData);

    revalidatePath('/admin/orders');
    revalidatePath(`/my-orders`);
    revalidatePath(`/orders/${orderId}`);
    if (status === "completed") {
      revalidatePath('/admin'); 
    }
    console.log(`Order ${orderId} status updated to ${status}.`);
    return { success: true, message: `Order ${orderId} status updated to ${status}.` };
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to update order status: ${errorMessage}` };
  }
}

export async function handleAdminUpdateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }
  if (!orderId) {
    return { success: false, message: "Order ID is required." };
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);
    if (!orderSnap.exists()) {
      return { success: false, message: "Order not found." };
    }
    const orderData = orderSnap.data();

    const updateData: any = {
      status: newStatus,
      lastUpdatedAt: serverTimestamp(),
    };

    // Update the order
    await updateDoc(orderDocRef, updateData);

    // Find and update the corresponding transaction record status
    if (orderData.paymentGatewayId) {
      const transactionQuery = query(
        collection(db, "transactions"),
        where("paymentGatewayId", "==", orderData.paymentGatewayId),
        limit(1)
      );
      const transactionSnapshot = await getDocs(transactionQuery);
      if (!transactionSnapshot.empty) {
        const transactionDocRef = transactionSnapshot.docs[0].ref;
        await updateDoc(transactionDocRef, {
          status: newStatus, // Align transaction status with order status
          updatedAt: serverTimestamp(),
        });
        console.log(`Transaction for PGID ${orderData.paymentGatewayId} updated to ${newStatus}.`);
      } else {
        console.warn(`No transaction found for Payment Gateway ID: ${orderData.paymentGatewayId} when updating order ${orderId} to ${newStatus}.`);
      }
    }


    if (newStatus === 'completed') {
      // Placeholder for sending email notification to user
      // const userEmail = orderData.userEmail;
      // if (userEmail) {
      //   console.log(`TODO: Send order completion email to ${userEmail} for order ${orderId}`);
      //   // await sendOrderCompletionEmail(userEmail, orderId, orderData.items);
      // }
    }

    revalidatePath('/admin/orders');
    revalidatePath('/my-orders');
    revalidatePath(`/orders/${orderId}`);
    if (newStatus === "completed") {
      revalidatePath('/admin'); // For dashboard stats
    }

    return { success: true, message: `Order ${orderId} status updated to ${newStatus}.` };
  } catch (error) {
    console.error(`Error updating order ${orderId} status by admin:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to update order status: ${errorMessage}` };
  }
}


const BOOK_DOWNLOADS_COLLECTION = 'bookDownloads';
const MAX_DOWNLOADS_PER_DAY = 5; 

export async function handleRecordDownload(
  bookId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured." };
  }
  if (!bookId || !userId) {
    return { success: false, message: "Book ID or User ID missing for download record." };
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const downloadsQuery = query(
      collection(db, BOOK_DOWNLOADS_COLLECTION),
      where('userId', '==', userId),
      where('downloadedAt', '>=', Timestamp.fromDate(startOfDay))
    );
    
    const downloadsSnapshot = await getDocs(downloadsQuery);
    
    let todayDownloads = 0;
    downloadsSnapshot.forEach(docSnap => {
        const downloadTimestamp = docSnap.data().downloadedAt as Timestamp;
        if (downloadTimestamp && typeof downloadTimestamp.toDate === 'function') {
            const downloadedAtDate = downloadTimestamp.toDate();
            if (downloadedAtDate >= startOfDay) {
                todayDownloads++;
            }
        }
    });

    if (todayDownloads >= MAX_DOWNLOADS_PER_DAY) {
      return { success: false, message: `You have reached your daily download limit of ${MAX_DOWNLOADS_PER_DAY} books.` };
    }

    await addDoc(collection(db, BOOK_DOWNLOADS_COLLECTION), {
      bookId,
      userId,
      downloadedAt: serverTimestamp(),
    });

    revalidatePath('/admin/downloads'); 
    revalidatePath('/admin'); 

    return { success: true, message: "Download recorded." };
  } catch (error) {
    console.error('Error recording download:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while recording download.';
    return { success: false, message: errorMessage };
  }
}

export async function handleBatchUpdateMissingOrderData(): Promise<{ success: boolean; message: string; updatedCount: number; errors: any[] }> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { success: false, message: "Firebase Project ID not configured.", updatedCount: 0, errors: [] };
  }

  try {
    const ordersRef = collection(db, "orders");
    const querySnapshot = await getDocs(ordersRef);
    
    if (querySnapshot.empty) {
      return { success: true, message: "No orders found to process.", updatedCount: 0, errors: [] };
    }

    const batch = writeBatch(db);
    let updatedCount = 0;
    const errors: { orderId: string; error: string }[] = [];

    querySnapshot.forEach(orderDoc => {
      const orderData = orderDoc.data();
      const updatePayload: any = {};
      let needsUpdate = false;

      if (typeof orderData.actualAmountPaid !== 'number' || isNaN(orderData.actualAmountPaid)) {
        const region = getRegionByCode(orderData.regionCode) || defaultRegion;
        let calculatedAmount = (orderData.totalAmountUSD || 0) * region.conversionRateToUSD;
        if (region.currencyCode === 'KES') {
          calculatedAmount = Math.round(calculatedAmount);
        } else {
          calculatedAmount = parseFloat(calculatedAmount.toFixed(2));
        }
        updatePayload.actualAmountPaid = calculatedAmount;
        needsUpdate = true;
      }

      if (!orderData.currencyCode || orderData.currencyCode === "N/A") {
        const region = getRegionByCode(orderData.regionCode) || defaultRegion;
        updatePayload.currencyCode = region.currencyCode;
        needsUpdate = true;
      }
      
      if (!orderData.paymentMethod || orderData.paymentMethod === "N/A" || orderData.paymentMethod === "") {
        updatePayload.paymentMethod = "mock" as PaymentMethod;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updatePayload.lastUpdatedAt = serverTimestamp();
        const docRef = doc(db, "orders", orderDoc.id);
        batch.update(docRef, updatePayload);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin');

    if (errors.length > 0) {
      return { success: false, message: `Batch update completed with ${errors.length} errors. ${updatedCount} orders updated.`, updatedCount, errors };
    }
    return { success: true, message: `Successfully processed orders. ${updatedCount} orders were updated.`, updatedCount, errors: [] };

  } catch (error) {
    console.error('Error batch updating missing order data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during batch update.';
    return { success: false, message: errorMessage, updatedCount: 0, errors: [{orderId: 'batch_commit', error: errorMessage}] };
  }
}

    