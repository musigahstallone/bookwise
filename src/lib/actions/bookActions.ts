
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
    const newBook = await addBookToDb(bookData);
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

// Server Action to delete a book
export async function handleDeleteBook(id: string, pdfUrl?: string) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }

    // Optional: Delete PDF from Firebase Storage
    if (pdfUrl && pdfUrl.includes('firebasestorage.googleapis.com')) {
      try {
        const fileRef = storageRef(storage, pdfUrl);
        await deleteObject(fileRef);
        console.log(`Successfully deleted PDF from Storage: ${pdfUrl}`);
      } catch (storageError) {
        // Log storage error but continue to delete Firestore document
        console.error(`Failed to delete PDF from Storage (${pdfUrl}):`, storageError);
        // You might want to return a partial success or specific error message here
      }
    }
    
    await deleteBookFromDb(id);
    revalidatePath('/admin/books');
    revalidatePath('/shop');
    return { success: true, message: 'Book deleted successfully.' };
  } catch (error) {
    console.error('Error deleting book:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to delete book: ${errorMessage}` };
  }
}
