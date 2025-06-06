
import type { Book } from '@/data/books';
import { getAllBooksFromDb } from '@/lib/book-service-firebase'; // Updated
import BookSearchClient from '@/components/books/BookSearchClient';
import { AlertTriangle } from 'lucide-react';

export default async function ShopPage() {
  let allBooks: Book[] = [];
  let fetchError: string | null = null;
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (firebaseConfigured) {
    try {
      allBooks = await getAllBooksFromDb();
    } catch (error) {
      console.error("Error fetching books for shop page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching books.";
    }
  }

  return (
    <div className="space-y-8">
      <section className="text-center py-8 bg-card rounded-lg shadow">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">Our Book Collection</h1>
        <p className="text-lg text-muted-foreground">Find your next adventure, one page at a time.</p>
      </section>
      
      {!firebaseConfigured && (
        <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
            <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</p>
            <p>The book catalog cannot be loaded because Firebase is not configured. Please check your <code>.env.local</code> settings.</p>
        </div>
      )}

      {firebaseConfigured && fetchError && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
            <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Books</p>
            <p>{fetchError} Please try again later or contact support.</p>
        </div>
      )}

      {firebaseConfigured && !fetchError && <BookSearchClient allBooks={allBooks} />}
    </div>
  );
}
