
'use client'; // Make this a client component to use AuthContext for conditional rendering

import { useEffect, useState } from 'react';
import { getBookByIdFromDb } from '@/lib/book-service-firebase';
import type { Book } from '@/data/books';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation'; // useParams for client components
import { ShoppingCart, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import AddToCartButton from '@/components/books/AddToCartButton';
import PriceDisplay from '@/components/books/PriceDisplay';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function BookDetailsPage() {
  const params = useParams(); // Use useParams for client components
  const bookId = typeof params.id === 'string' ? params.id : '';
  
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const { currentUser, isLoading: authIsLoading } = useAuth(); // Get currentUser from AuthContext

  useEffect(() => {
    async function fetchBook() {
      if (!bookId) {
        setIsLoading(false);
        // Potentially call notFound() or set an error if bookId is invalid early
        return;
      }
      if (firebaseConfigured) {
        try {
          const fetchedBook = await getBookByIdFromDb(bookId);
          setBook(fetchedBook);
          if (!fetchedBook) {
            // If Firebase is configured but book not found, it's a true 404 for this ID
             setFetchError("Book not found."); // Or trigger notFound() after state update
          }
        } catch (error) {
          console.error(`Error fetching book ${bookId}:`, error);
          setFetchError(error instanceof Error ? error.message : "An unknown error occurred.");
        }
      }
      setIsLoading(false);
    }
    fetchBook();
  }, [bookId, firebaseConfigured]);

  if (isLoading || authIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading book details...</p>
      </div>
    );
  }

  if (!firebaseConfigured) {
    return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Firebase Not Configured</h1>
        <p className="text-muted-foreground">Book details cannot be loaded. Please configure Firebase in <code>.env.local</code>.</p>
        <Button variant="outline" asChild className="mt-6">
            <Link href="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }
  
  if (fetchError && !book) { // If there was an error and no book was found
     // If the specific error was "Book not found", trigger Next.js 404
    if (fetchError.toLowerCase().includes("book not found")) {
        notFound();
    }
    // For other errors, display an error message
    return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Book</h1>
        <p className="text-muted-foreground">{fetchError}</p>
         <Button variant="outline" asChild className="mt-6">
            <Link href="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  if (!book) {
    // This will be caught if fetchBook sets book to null and no error, or if error wasn't "not found"
    // but still resulted in no book.
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="outline" asChild className="mb-6 group">
        <Link href="/shop">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to all books
        </Link>
      </Button>
      <Card className="overflow-hidden shadow-xl">
        <div className="md:flex">
          <div className="md:w-1/3 p-4">
            <div className="aspect-square relative rounded-lg overflow-hidden shadow-md">
              <Image
                src={book.coverImageUrl}
                alt={book.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                data-ai-hint={book.dataAiHint || 'book cover detail'}
              />
            </div>
          </div>
          <div className="md:w-2/3">
            <CardHeader className="p-6">
              <CardTitle className="text-4xl font-headline mb-2">{book.title}</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                By{' '}
                <Link href={`/authors/${encodeURIComponent(book.author)}`} className="hover:underline text-primary/90">
                  {book.author}
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <PriceDisplay usdPrice={book.price} className="text-2xl font-bold text-primary mb-4" /> 
              <Separator className="my-4" />
              <h3 className="text-xl font-semibold mb-2 font-headline">Description</h3>
              <p className="text-base leading-relaxed mb-6 whitespace-pre-line">
                {book.longDescription || book.description}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <AddToCartButton book={book} />
                {!currentUser && !authIsLoading && (
                  <p className="text-sm text-muted-foreground">
                    Or <Link href="/login" className="text-primary hover:underline">login</Link> to add to cart.
                  </p>
                )}
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
