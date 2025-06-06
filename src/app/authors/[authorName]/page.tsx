
import { getBooksByAuthorFromDb } from '@/lib/book-service-firebase'; 
import type { Book } from '@/data/books';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserCircle, ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import ErrorDisplay from '@/components/layout/ErrorDisplay'; // New Import
import { revalidatePath } from 'next/cache';


interface AuthorPageProps {
    params: { authorName: string };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let authorBooks: Book[] = [];
  let fetchError: string | null = null;
  let decodedAuthorName = '';

  try {
    decodedAuthorName = decodeURIComponent(params.authorName);
  } catch (error) {
    console.error("Error decoding author name:", error);
    notFound(); 
  }


  if (firebaseConfigured) {
    try {
        authorBooks = await getBooksByAuthorFromDb(decodedAuthorName);
    } catch (error) {
        console.error(`Error fetching books for author ${decodedAuthorName}:`, error);
        fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching author's books.";
    }
  }

  const handleRetry = async () => {
    'use server';
    revalidatePath(`/authors/${params.authorName}`);
  }


  if (!firebaseConfigured) {
     return (
      <div className="max-w-4xl mx-auto py-10">
        <ErrorDisplay
          title="Firebase Not Configured"
          message="Author details cannot be loaded. Please configure Firebase in .env.local."
        />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <ErrorDisplay
          title="Error Loading Author's Books"
          message={fetchError}
          retryAction={handleRetry}
        />
      </div>
    );
  }


  return (
    <div className="max-w-5xl mx-auto">
      <Button variant="outline" asChild className="mb-6 group">
        <Link href="/shop">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Shop
        </Link>
      </Button>

      <div className="text-center mb-10">
        <UserCircle className="mx-auto h-20 w-20 text-primary mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary">{decodedAuthorName}</h1>
      </div>

      {authorBooks.length > 0 ? (
        <>
          <h2 className="text-2xl font-headline font-semibold text-foreground mb-6">Books by {decodedAuthorName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {authorBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-center text-lg text-muted-foreground py-10">
          No books by {decodedAuthorName} found in our catalog at this time.
        </p>
      )}
    </div>
  );
}
