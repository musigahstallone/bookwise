
// src/lib/book-service.ts
// This file is now mostly DEPRECATED for runtime application use.
// Its primary purpose is to serve as a source for the initial book data structure
// and for the `books` array which can be used for seeding the Firestore database.
// For actual CRUD operations, use `src/lib/book-service-firebase.ts` and Server Actions.

import { books as allBooksData, type Book } from '@/data/books';

// The mutableBooks array is no longer the source of truth for the application.
// Admin operations will directly interact with Firebase Firestore.
// This in-memory manipulation is now only relevant if you were to run parts of the app
// without Firebase or for specific isolated testing that doesn't involve persistence.

let mutableBooks_deprecated: Book[] = JSON.parse(JSON.stringify(allBooksData));

export const getAllBooksAdmin_deprecated = (): Book[] => {
  console.warn("Deprecated: getAllBooksAdmin_deprecated is called. Data should be fetched from Firestore.");
  return mutableBooks_deprecated;
};

export const getBookByIdAdmin_deprecated = (id: string): Book | undefined => {
  console.warn("Deprecated: getBookByIdAdmin_deprecated is called. Data should be fetched from Firestore.");
  return mutableBooks_deprecated.find(book => book.id === id);
};

export const addBookAdmin_deprecated = (bookData: Omit<Book, 'id'>): Book => {
  console.warn("Deprecated: addBookAdmin_deprecated is called. Data should be added to Firestore via Server Action.");
  const newBook: Book = { ...bookData, id: String(Date.now() + Math.floor(Math.random() * 1000)) };
  mutableBooks_deprecated.unshift(newBook);
  return newBook;
};

export const updateBookAdmin_deprecated = (id: string, updates: Partial<Omit<Book, 'id'>>): Book | undefined => {
  console.warn("Deprecated: updateBookAdmin_deprecated is called. Data should be updated in Firestore via Server Action.");
  const bookIndex = mutableBooks_deprecated.findIndex(book => book.id === id);
  if (bookIndex === -1) return undefined;
  
  mutableBooks_deprecated[bookIndex] = { ...mutableBooks_deprecated[bookIndex], ...updates };
  return mutableBooks_deprecated[bookIndex];
};

export const deleteBookAdmin_deprecated = (id: string): boolean => {
  console.warn("Deprecated: deleteBookAdmin_deprecated is called. Data should be deleted from Firestore via Server Action.");
  const bookIndex = mutableBooks_deprecated.findIndex(book => book.id === id);
  if (bookIndex === -1) return false;
  
  mutableBooks_deprecated.splice(bookIndex, 1);
  return true;
};

// The `books` export from `src/data/books.ts` should be the primary source for seeding.
// This file's direct manipulation of `allBooksData` is removed to avoid confusion.
// The application should rely on Firestore as the single source of truth post-seeding.
