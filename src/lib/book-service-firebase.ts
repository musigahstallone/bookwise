
// src/lib/book-service-firebase.ts
import { db } from '@/lib/firebase';
import type { Book } from '@/data/books';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc, // Changed from addDoc
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

const BOOKS_COLLECTION = 'books';

export const getAllBooksFromDb = async (): Promise<Book[]> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning empty array.");
    return [];
  }
  try {
    const booksSnapshot = await getDocs(collection(db, BOOKS_COLLECTION));
    const booksList = booksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Book));
    return booksList;
  } catch (error) {
    console.error("Error fetching books from Firestore:", error);
    return [];
  }
};

export const getBookByIdFromDb = async (id: string): Promise<Book | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning null.");
    return null;
  }
  try {
    const bookDocRef = doc(db, BOOKS_COLLECTION, id);
    const bookDoc = await getDoc(bookDocRef);
    if (bookDoc.exists()) {
      return { id: bookDoc.id, ...bookDoc.data() } as Book;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching book with ID ${id} from Firestore:`, error);
    return null;
  }
};

export const getBooksByAuthorFromDb = async (authorName: string): Promise<Book[]> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning empty array.");
    return [];
  }
  try {
    const q = query(collection(db, BOOKS_COLLECTION), where("author", "==", authorName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
  } catch (error) {
    console.error(`Error fetching books by author ${authorName} from Firestore:`, error);
    return [];
  }
};

// Use setDoc with a specific ID (generated from title by server action)
export const addBookToDb = async (id: string, bookData: Omit<Book, 'id'>): Promise<Book> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const bookDocRef = doc(db, BOOKS_COLLECTION, id);
  await setDoc(bookDocRef, bookData);
  return { id, ...bookData };
};

export const updateBookInDb = async (id: string, updates: Partial<Omit<Book, 'id'>>): Promise<Book | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const bookDocRef = doc(db, BOOKS_COLLECTION, id);
  await updateDoc(bookDocRef, updates);
  const updatedDoc = await getDoc(bookDocRef);
  if (updatedDoc.exists()) {
    return { id: updatedDoc.id, ...updatedDoc.data() } as Book;
  }
  return null;
};

export const deleteBookFromDb = async (id: string): Promise<void> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const bookDocRef = doc(db, BOOKS_COLLECTION, id);
  await deleteDoc(bookDocRef);
};

// For seeding, we use the IDs from the mock data.
export const seedBooksToFirestore = async (booksToSeed: Book[]): Promise<{count: number, errors: any[]}> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured for seeding.");
  }
  const batch = writeBatch(db);
  let count = 0;
  const errors: any[] = [];

  for (const book of booksToSeed) {
    try {
      const docRef = doc(db, BOOKS_COLLECTION, book.id); // Use predefined ID from mock data
      const { id, ...bookDataToSeed } = book;
      batch.set(docRef, bookDataToSeed);
      count++;
    } catch (error) {
      console.error(`Error preparing book "${book.title}" for batch seed:`, error);
      errors.push({ title: book.title, error });
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully seeded ${count} books to Firestore.`);
    return { count, errors };
  } catch (error) {
    console.error("Error committing seed batch to Firestore:", error);
    errors.push({ general: "Batch commit failed", error });
    return { count: 0, errors };
  }
};

export const countBooksInDb = async (): Promise<number> => {
   if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning 0 for count.");
    return 0;
  }
  try {
    const booksSnapshot = await getDocs(collection(db, BOOKS_COLLECTION));
    return booksSnapshot.size;
  } catch (error) {
    console.error("Error counting books in Firestore:", error);
    return 0;
  }
};
