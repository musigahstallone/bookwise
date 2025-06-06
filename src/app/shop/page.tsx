
import type { Book } from '@/data/books';
import { getAllBooksFromDb } from '@/lib/book-service-firebase';
import BookSearchClient from '@/components/books/BookSearchClient';
import ErrorDisplay from '@/components/layout/ErrorDisplay'; // New Import
import { revalidatePath } from 'next/cache';

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
  
  const handleRetry = async () => {
    'use server';
    revalidatePath('/shop');
  }

  return (
    <div className="space-y-8">
      <section className="text-center py-8 bg-card rounded-lg shadow">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">Our Book Collection</h1>
        <p className="text-lg text-muted-foreground">Find your next adventure, one page at a time.</p>
      </section>
      
      {!firebaseConfigured && (
        <ErrorDisplay 
          title="Firebase Not Configured"
          message="The book catalog cannot be loaded because Firebase is not configured. Please check your .env.local settings."
          showHomeButton={false}
        />
      )}

      {firebaseConfigured && fetchError && (
        <ErrorDisplay 
          title="Error Loading Books"
          message={`${fetchError} Please try again later or contact support.`}
          retryAction={handleRetry}
        />
      )}

      {firebaseConfigured && !fetchError && <BookSearchClient allBooks={allBooks} />}
    </div>
  );
}
