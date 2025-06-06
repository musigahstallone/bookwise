
'use client'; // Mark as client component if it's going to be used by client components directly for stateful operations

import { books as allBooksData, type Book } from '@/data/books';

// Make a mutable copy for admin operations for this session
// This is a simplified approach for a prototype. In a real app, this would be a backend API.
let mutableBooks: Book[] = JSON.parse(JSON.stringify(allBooksData));

// Function to generate a new unique ID (simple implementation)
const generateId = () => String(Date.now() + Math.floor(Math.random() * 1000));

export const getAllBooksAdmin = (): Book[] => {
  return mutableBooks;
};

export const getBookByIdAdmin = (id: string): Book | undefined => {
  return mutableBooks.find(book => book.id === id);
};

export const addBookAdmin = (bookData: Omit<Book, 'id'>): Book => {
  const newBook: Book = { ...bookData, id: generateId() };
  mutableBooks.unshift(newBook); // Add to the beginning to see it easily
  // Update the original books array as well to reflect on the main site for demo purposes
  // This is a hack for the prototype.
  const originalBookIndex = allBooksData.findIndex(b => b.id === newBook.id);
  if (originalBookIndex === -1) {
    allBooksData.unshift(JSON.parse(JSON.stringify(newBook)));
  }
  return newBook;
};

export const updateBookAdmin = (id: string, updates: Partial<Omit<Book, 'id'>>): Book | undefined => {
  const bookIndex = mutableBooks.findIndex(book => book.id === id);
  if (bookIndex === -1) return undefined;
  
  mutableBooks[bookIndex] = { ...mutableBooks[bookIndex], ...updates };

  // Update the original books array as well
  const originalBookIndexAll = allBooksData.findIndex(b => b.id === id);
  if (originalBookIndexAll !== -1) {
    allBooksData[originalBookIndexAll] = { ...allBooksData[originalBookIndexAll], ...updates };
  }
  return mutableBooks[bookIndex];
};

export const deleteBookAdmin = (id: string): boolean => {
  const bookIndex = mutableBooks.findIndex(book => book.id === id);
  if (bookIndex === -1) return false;
  
  mutableBooks.splice(bookIndex, 1);

  // Update the original books array as well
  const originalBookIndexAll = allBooksData.findIndex(b => b.id === id);
  if (originalBookIndexAll !== -1) {
    allBooksData.splice(originalBookIndexAll, 1);
  }
  return true;
};

// This function could be called if we had a way to "publish" changes,
// but for now, mutations are in-memory for the session.
export const syncDataToSource = () => {
    // In a real scenario, this might try to write back to a file or API.
    // For this prototype, we're directly mutating allBooksData for shared visibility.
    console.warn("Data sync in prototype relies on direct mutation of imported 'allBooksData'. Changes are session-based.");
};

// Helper to reset to original data if needed for testing
export const resetBooksAdmin = () => {
    mutableBooks = JSON.parse(JSON.stringify(allBooksData));
     // This won't reset allBooksData if it was mutated directly.
     // To truly reset allBooksData, we'd need to re-import or have initial copy.
     // For now, this primarily resets the admin's 'mutableBooks'.
};
