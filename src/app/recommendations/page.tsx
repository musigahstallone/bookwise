
import AIRecommenderClient from '@/components/ai/AIRecommenderClient';
import { getAllBooksFromDb } from '@/lib/book-service-firebase'; 
import type { Book } from '@/data/books';
import { Sparkles } from 'lucide-react';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { revalidatePath } from 'next/cache';
import { isGenkitConfigured } from '@/ai/genkit'; // Import the flag

export default async function RecommendationsPage() {
  let allBooks: Book[] = [];
  let bookDescriptionsForAI: { title: string; description: string }[] = [];
  let fetchError: string | null = null;
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!isGenkitConfigured) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-headline font-bold text-primary mb-2">AI Book Recommender</h1>
           <p className="text-lg text-muted-foreground">
            Tell us what you're in the mood for, and our AI will suggest the perfect book!
          </p>
        </div>
        <ErrorDisplay
          title="AI Recommender Not Available"
          message="The AI Book Recommender is currently not configured (e.g., API key might be missing). Please contact the site administrator if you believe this is an error."
          showHomeButton={true}
          className="text-center"
        />
      </div>
    );
  }

  // Proceed to fetch books if Genkit is configured (or if you want to show books even if AI fails later)
  if (firebaseConfigured) {
    try {
      allBooks = await getAllBooksFromDb();
      bookDescriptionsForAI = allBooks.map(book => ({
        title: book.title,
        description: book.longDescription || book.description,
      }));
    } catch (error) {
      console.error("Error fetching books for recommendations:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching books for the AI recommender.";
    }
  }

  const handleRetry = async () => {
    'use server';
    revalidatePath('/recommendations');
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
        <ErrorDisplay
          title="Book Catalog Not Available"
          message="The AI Recommender needs book data from Firebase, which is not configured. Please set up your .env.local settings."
          showHomeButton={false}
          className="text-center"
        />
      )}

      {firebaseConfigured && fetchError && (
        <ErrorDisplay
          title="Error Loading Book Data for AI"
          message={fetchError}
          retryAction={handleRetry}
          className="text-center"
        />
      )}
      
      {/* Ensure AIRecommenderClient is only rendered if both Firebase and Genkit are good */}
      {firebaseConfigured && !fetchError && isGenkitConfigured && (
         <AIRecommenderClient bookCatalog={bookDescriptionsForAI} allBooks={allBooks} />
      )}
    </div>
  );
}
