
import { getBooksByAuthorFromDb } from '@/lib/book-service-firebase'; // Updated
import type { Book } from '@/data/books';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, UserCircle, AlertTriangle } from 'lucide-react';
import { notFound } from 'next/navigation';


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
    notFound(); // Invalid author name format
  }


  if (firebaseConfigured) {
    try {
        authorBooks = await getBooksByAuthorFromDb(decodedAuthorName);
        // We determine if an author "exists" if they have books or if we had a separate authors collection.
        // For now, if no books are found by this author in Firestore, we can assume the author might not exist
        // in our catalog or has no books listed.
        if (authorBooks.length === 0) {
             // Check if *any* book has this author, even if getBooksByAuthorFromDb is empty.
             // This is more of a sanity check for a "valid" author name even if no books currently.
             // This logic can be refined if you have a separate 'authors' collection in Firestore.
             // For now, if no books, we'll show "no books found". A true 404 might be if the author name format is invalid.
        }
    } catch (error) {
        console.error(`Error fetching books for author ${decodedAuthorName}:`, error);
        fetchError = error instanceof Error ? error.message : "An unknown error occurred.";
    }
  }


  if (!firebaseConfigured) {
     return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Firebase Not Configured</h1>
        <p className="text-muted-foreground">Author details cannot be loaded. Please configure Firebase in <code>.env.local</code>.</p>
         <Button variant="outline" asChild className="mt-6">
            <Link href="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Author's Books</h1>
        <p className="text-muted-foreground">{fetchError}</p>
         <Button variant="outline" asChild className="mt-6">
            <Link href="/shop">Back to Shop</Link>
        </Button>
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
        {/* Placeholder for author bio - could be added to Firestore later */}
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
