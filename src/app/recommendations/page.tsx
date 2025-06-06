
import AIRecommenderClient from '@/components/ai/AIRecommenderClient';
import { getAllBooksFromDb } from '@/lib/book-service-firebase'; // Updated
import type { Book } from '@/data/books';
import { Sparkles, AlertTriangle } from 'lucide-react';

export default async function RecommendationsPage() {
  let allBooks: Book[] = [];
  let bookDescriptionsForAI: { title: string; description: string }[] = [];
  let fetchError: string | null = null;
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (firebaseConfigured) {
    try {
      allBooks = await getAllBooksFromDb();
      bookDescriptionsForAI = allBooks.map(book => ({
        title: book.title,
        description: book.longDescription || book.description,
      }));
    } catch (error) {
      console.error("Error fetching books for recommendations:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching books.";
    }
  }
  
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">AI Book Recommender</h1>
        <p className="text-lg text-muted-foreground">
          Tell us what you're in the mood for, and our AI will suggest the perfect book!
        </p>
      </div>

      {!firebaseConfigured && (
        <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md text-center">
            <p className="font-bold flex items-center justify-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</p>
            <p>The AI Recommender needs book data from Firebase. Please configure your <code>.env.local</code> settings.</p>
        </div>
      )}

      {firebaseConfigured && fetchError && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md text-center">
            <p className="font-bold flex items-center justify-center"><AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Book Data</p>
            <p>{fetchError}</p>
        </div>
      )}
      
      {firebaseConfigured && !fetchError && (
         <AIRecommenderClient bookCatalog={bookDescriptionsForAI} allBooks={allBooks} />
      )}
    </div>
  );
}
