
'use server';

import { revalidatePath } from 'next/cache';
import { books as mockBooks, type Book } from '@/data/books';
import { 
  addBookToDb, 
  updateBookInDb, 
  deleteBookFromDb,
  seedBooksToFirestore as seedBooksToDb, // Renamed for clarity
} from '@/lib/book-service-firebase';
import { storage } from '@/lib/firebase';
import { ref as storageRef, deleteObject } from 'firebase/storage';

// Helper to sanitize title for Firestore document ID
function sanitizeTitleForId(title: string): string {
  if (!title) return `book-${Date.now()}`; // Fallback if title is empty
  const sanitized = title
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // Remove non-alphanumeric characters except hyphens
    .substring(0, 100); // Limit length

  // Ensure it's not empty after sanitization and doesn't start/end with hyphen
  let finalId = sanitized.replace(/^-+|-+$/g, '');
  if (!finalId) return `book-${Date.now()}`;
  return finalId;
}


export async function handleSeedDatabase() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    // Pass mockBooks with their existing IDs for seeding
    const result = await seedBooksToDb(mockBooks); 
    if (result.errors.length > 0) {
      console.error("Errors during seeding:", result.errors);
      return { success: false, message: `Seeding partially failed. Seeded ${result.count} books. Check server logs for errors.` };
    }
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/books');
    revalidatePath('/shop');
    return { success: true, message: `Successfully seeded ${result.count} books to Firestore.` };
  } catch (error) {
    console.error('Error seeding database:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during seeding.';
    return { success: false, message: `Failed to seed database: ${errorMessage}` };
  }
}

export async function handleAddBook(bookData: Omit<Book, 'id'>) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const fullBookData = {
        ...bookData,
        pdfUrl: bookData.pdfUrl || '/pdfs/placeholder-book.pdf',
        coverImageUrl: bookData.coverImageUrl || 'https://placehold.co/300x300.png',
    };

    const newBookId = sanitizeTitleForId(fullBookData.title);
    // Check if a book with this ID already exists can be added here if necessary

    const newBook = await addBookToDb(newBookId, fullBookData);
    revalidatePath('/');
    revalidatePath('/admin/books');
    revalidatePath('/shop');
    // Consider revalidating the specific author page if performance allows
    // revalidatePath(`/authors/${encodeURIComponent(newBook.author)}`);
    return { success: true, message: 'Book added successfully.', book: newBook };
  } catch (error) {
    console.error('Error adding book:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Consider checking for specific Firestore errors, e.g., if setDoc fails due to permissions or existing doc rules.
    return { success: false, message: `Failed to add book: ${errorMessage}` };
  }
}

export async function handleUpdateBook(id: string, bookData: Partial<Omit<Book, 'id'>>) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const updatedBook = await updateBookInDb(id, bookData);
    if (!updatedBook) {
        return { success: false, message: 'Book not found for update.' };
    }
    revalidatePath('/');
    revalidatePath('/admin/books');
    revalidatePath(`/admin/books/edit/${id}`);
    revalidatePath(`/books/${id}`);
    revalidatePath('/shop');
    // Consider revalidating the specific author page if performance allows
    // revalidatePath(`/authors/${encodeURIComponent(updatedBook.author)}`);
    return { success: true, message: 'Book updated successfully.', book: updatedBook };
  } catch (error) {
    console.error('Error updating book:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to update book: ${errorMessage}` };
  }
}

async function deleteFromStorage(fileUrl?: string, type?: string) {
  if (fileUrl && fileUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const fileRef = storageRef(storage, fileUrl);
      await deleteObject(fileRef);
      console.log(`Successfully deleted ${type || 'file'} from Storage: ${fileUrl}`);
    } catch (storageError: any) {
      if (storageError.code !== 'storage/object-not-found') {
         console.error(`Failed to delete ${type || 'file'} from Storage (${fileUrl}):`, storageError);
      } else {
         console.log(`${type || 'File'} not found in Storage, presumed already deleted: ${fileUrl}`);
      }
    }
  }
}

export async function handleDeleteBook(id: string, pdfUrl?: string, coverImageUrl?: string) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    
    // To revalidate author page, we might need author before deleting
    // const bookToDelete = await getBookByIdFromDb(id); // Requires getBookByIdFromDb to be available here

    await deleteFromStorage(pdfUrl, "PDF");
    await deleteFromStorage(coverImageUrl, "Cover Image");
    await deleteBookFromDb(id);

    revalidatePath('/');
    revalidatePath('/admin/books');
    revalidatePath('/shop');
    // if (bookToDelete) {
    //   revalidatePath(`/authors/${encodeURIComponent(bookToDelete.author)}`);
    // } else {
    //   revalidatePath('/authors'); // Broader revalidation if author info not fetched
    // }
    return { success: true, message: 'Book deleted successfully.' };
  } catch (error) {
    console.error('Error deleting book:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to delete book: ${errorMessage}` };
  }
}
