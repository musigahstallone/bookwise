
// src/lib/cart-service-firebase.ts
import { db } from '@/lib/firebase';
import type { Book } from '@/data/books';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  serverTimestamp,
} from 'firebase/firestore';

export interface CartItem extends Book {
  quantity: 1; // Always 1 for PDF downloads
  addedAt?: any; // Firestore serverTimestamp
}

const USER_CART_COLLECTION = (userId: string) => `users/${userId}/cartItems`;

export const getCartItemsFromDb = async (userId: string): Promise<CartItem[]> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !userId) {
    return [];
  }
  try {
    const cartSnapshot = await getDocs(query(collection(db, USER_CART_COLLECTION(userId))));
    // Order by addedAt if needed, or let client sort. For now, just map.
    return cartSnapshot.docs.map(doc => ({
      ...(doc.data() as Omit<CartItem, 'id'>), // Data from Firestore
      id: doc.id, // bookId is the document ID
    }));
  } catch (error) {
    console.error("Error fetching cart items from Firestore:", error);
    throw error; // Re-throw to be caught by CartContext
  }
};

export const addBookToFirestoreCart = async (userId: string, book: Book): Promise<CartItem> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !userId) {
    throw new Error("Firebase Project ID not configured or User ID missing.");
  }
  const cartItemRef = doc(db, USER_CART_COLLECTION(userId), book.id); // Use book.id as doc ID
  const newCartItem: CartItem = {
    ...book,
    quantity: 1,
    addedAt: serverTimestamp(),
  };
  // We don't need to store 'id' inside the document if it's the doc ID itself.
  // Firestore data should match Book properties + quantity + addedAt
  const { id, ...dataToSave } = newCartItem;

  await setDoc(cartItemRef, dataToSave);
  return newCartItem; // Return the item as it would be in the cart state
};

export const removeBookFromFirestoreCart = async (userId: string, bookId: string): Promise<void> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !userId) {
    throw new Error("Firebase Project ID not configured or User ID missing.");
  }
  const cartItemRef = doc(db, USER_CART_COLLECTION(userId), bookId);
  await deleteDoc(cartItemRef);
};

export const clearFirestoreCart = async (userId: string): Promise<void> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !userId) {
    throw new Error("Firebase Project ID not configured or User ID missing.");
  }
  const cartItemsRef = collection(db, USER_CART_COLLECTION(userId));
  const cartSnapshot = await getDocs(query(cartItemsRef));
  
  if (cartSnapshot.empty) {
    return; // No items to delete
  }

  const batch = writeBatch(db);
  cartSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};
