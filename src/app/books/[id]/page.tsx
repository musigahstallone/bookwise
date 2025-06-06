
import { getBookByIdFromDb } from '@/lib/book-service-firebase'; // Updated
import type { Book } from '@/data/books';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShoppingCart, ArrowLeft, AlertTriangle } from 'lucide-react';
// BuyButtonClient might be removed or re-evaluated if AddToCart is primary action
// For now, keep AddToCart from CartContext
import AddToCartButton from '@/components/books/AddToCartButton'; // New client component for cart interaction

interface BookDetailsPageProps {
  params: { id: string };
}

export default async function BookDetailsPage({ params }: BookDetailsPageProps) {
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let book: Book | null = null;
  let fetchError: string | null = null;

  if (firebaseConfigured) {
    try {
      book = await getBookByIdFromDb(params.id);
    } catch (error) {
      console.error(`Error fetching book ${params.id}:`, error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred.";
    }
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
  
  if (fetchError) {
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
                fill // Changed from layout="fill" to fill for Next 13+
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes, adjust as needed
                style={{ objectFit: 'cover' }} // Replaces objectFit prop
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
              <p className="text-2xl font-bold text-primary mb-4">${book.price.toFixed(2)}</p>
              <Separator className="my-4" />
              <h3 className="text-xl font-semibold mb-2 font-headline">Description</h3>
              <p className="text-base leading-relaxed mb-6 whitespace-pre-line">
                {book.longDescription || book.description}
              </p>
              <div className="flex space-x-3">
                <AddToCartButton book={book} />
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
