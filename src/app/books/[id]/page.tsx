
'use client'; 

import { useEffect, useState } from 'react';
import { getBookByIdFromDb } from '@/lib/book-service-firebase';
import type { Book } from '@/data/books';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { notFound, useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AddToCartButton from '@/components/books/AddToCartButton';
import PriceDisplay from '@/components/books/PriceDisplay';
import { useAuth } from '@/contexts/AuthContext';
import ErrorDisplay from '@/components/layout/ErrorDisplay'; // New Import

export default function BookDetailsPage() {
  const params = useParams(); 
  const router = useRouter();
  const bookId = typeof params.id === 'string' ? params.id : '';
  
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const { currentUser, isLoading: authIsLoading } = useAuth();

  useEffect(() => {
    async function fetchBookData() {
      if (!bookId) {
        setIsLoading(false);
        setFetchError("Invalid book ID provided.");
        return;
      }
      if (firebaseConfigured) {
        try {
          const fetchedBook = await getBookByIdFromDb(bookId);
          setBook(fetchedBook);
          if (!fetchedBook) {
             setFetchError("Book not found."); 
          }
        } catch (error) {
          console.error(`Error fetching book ${bookId}:`, error);
          setFetchError(error instanceof Error ? error.message : "An unknown error occurred while fetching book details.");
        }
      } else {
        setFetchError("Firebase is not configured. Cannot load book details.");
      }
      setIsLoading(false);
    }
    fetchBookData();
  }, [bookId, firebaseConfigured]);

  const handleRetry = () => {
    setFetchError(null);
    setIsLoading(true);
    // Re-trigger useEffect by dependency change is complex here,
    // so we'll just re-call the fetch function or reload.
    // For simplicity, a reload or re-nav might be easiest if retry is complex
    // router.refresh(); // If using Server Component or for re-fetching server data
    // For client component, we'd call fetchBookData again:
    async function fetchBookData() {
      if (!bookId) { setIsLoading(false); setFetchError("Invalid book ID."); return; }
      if (firebaseConfigured) {
        try {
          const fetchedBook = await getBookByIdFromDb(bookId);
          setBook(fetchedBook);
          if (!fetchedBook) { setFetchError("Book not found."); }
        } catch (error) {
          setFetchError(error instanceof Error ? error.message : "Unknown error.");
        }
      } else { setFetchError("Firebase not configured."); }
      setIsLoading(false);
    }
    fetchBookData();
  };

  if (isLoading || authIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading book details...</p>
      </div>
    );
  }
  
  if (fetchError && !book) {
    if (fetchError.toLowerCase().includes("book not found")) {
        notFound();
    }
    return (
      <ErrorDisplay
        title="Error Loading Book"
        message={fetchError}
        retryAction={firebaseConfigured ? handleRetry : undefined}
        showHomeButton={true}
      />
    );
  }
  
  if (!firebaseConfigured && !book) {
     return (
      <ErrorDisplay
        title="Firebase Not Configured"
        message="Book details cannot be loaded. Please configure Firebase."
        showHomeButton={true}
      />
    );
  }


  if (!book) {
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
