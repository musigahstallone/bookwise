
'use server';

import { revalidatePath } from 'next/cache';
import { books as mockBooks, type Book } from '@/data/books';
import { 
  seedBooksToFirestore as seedBooksToDb, 
  addBookToDb, 
  updateBookInDb, 
  deleteBookFromDb 
} from '@/lib/book-service-firebase';
import { storage } from '@/lib/firebase';
import { ref as storageRef, deleteObject } from 'firebase/storage';

// Server Action to seed the database
export async function handleSeedDatabase() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const result = await seedBooksToDb(mockBooks);
    if (result.errors.length > 0) {
      console.error("Errors during seeding:", result.errors);
      return { success: false, message: `Seeding partially failed. Seeded ${result.count} books. Check server logs for errors.` };
    }
    revalidatePath('/admin');
    revalidatePath('/admin/books');
    revalidatePath('/shop');
    // Revalidate other paths that display book data if necessary
    return { success: true, message: `Successfully seeded ${result.count} books to Firestore.` };
  } catch (error) {
    console.error('Error seeding database:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during seeding.';
    return { success: false, message: `Failed to seed database: ${errorMessage}` };
  }
}

// Server Action to add a book
export async function handleAddBook(bookData: Omit<Book, 'id'>) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    // Ensure essential URLs have defaults if not provided by client (though client should handle this)
    const fullBookData = {
        ...bookData,
        pdfUrl: bookData.pdfUrl || '/pdfs/placeholder-book.pdf',
        coverImageUrl: bookData.coverImageUrl || 'https://placehold.co/300x300.png',
    };
    const newBook = await addBookToDb(fullBookData);
    revalidatePath('/admin/books');
    revalidatePath('/shop');
    return { success: true, message: 'Book added successfully.', book: newBook };
  } catch (error) {
    console.error('Error adding book:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to add book: ${errorMessage}` };
  }
}

// Server Action to update a book
export async function handleUpdateBook(id: string, bookData: Partial<Omit<Book, 'id'>>) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const updatedBook = await updateBookInDb(id, bookData);
    if (!updatedBook) {
        return { success: false, message: 'Book not found for update.' };
    }
    revalidatePath('/admin/books');
    revalidatePath(`/admin/books/edit/${id}`);
    revalidatePath(`/books/${id}`);
    revalidatePath('/shop');
    return { success: true, message: 'Book updated successfully.', book: updatedBook };
  } catch (error) {
    console.error('Error updating book:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to update book: ${errorMessage}` };
  }
}

// Helper function to safely delete from Firebase Storage
async function deleteFromStorage(fileUrl?: string, type?: string) {
  if (fileUrl && fileUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const fileRef = storageRef(storage, fileUrl);
      await deleteObject(fileRef);
      console.log(`Successfully deleted ${type || 'file'} from Storage: ${fileUrl}`);
    } catch (storageError: any) {
      // Log storage error but continue
      // ENOENT means file not found, which is fine if it was already deleted or never existed.
      if (storageError.code !== 'storage/object-not-found') {
         console.error(`Failed to delete ${type || 'file'} from Storage (${fileUrl}):`, storageError);
      } else {
         console.log(`${type || 'File'} not found in Storage, presumed already deleted: ${fileUrl}`);
      }
    }
  }
}

// Server Action to delete a book
export async function handleDeleteBook(id: string, pdfUrl?: string, coverImageUrl?: string) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }

    await deleteFromStorage(pdfUrl, "PDF");
    await deleteFromStorage(coverImageUrl, "Cover Image");
    
    await deleteBookFromDb(id);
    revalidatePath('/admin/books');
    revalidatePath('/shop');
    // Consider revalidating author pages or book detail pages if they might be cached
    return { success: true, message: 'Book deleted successfully.' };
  } catch (error) {
    console.error('Error deleting book:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to delete book: ${errorMessage}` };
  }
}
