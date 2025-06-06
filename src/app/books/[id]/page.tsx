
'use client';

import { getBookById, type Book } from '@/data/books';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useEffect, useState } from 'react';


export default function BookDetailsPage() {
  const params = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const [book, setBook] = useState<Book | null | undefined>(undefined);

  useEffect(() => {
    if (params.id) {
      const foundBook = getBookById(params.id);
      setBook(foundBook);
    }
  }, [params.id]);


  if (book === undefined) {
    return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <p>Loading book details...</p>
      </div>
    );
  }


  if (!book) {
    notFound();
  }

  const handleAddToCart = () => {
    addToCart(book);
  };

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
                layout="fill"
                objectFit="cover"
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
                <Button size="lg" onClick={handleAddToCart} className="bg-primary hover:bg-primary/90">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
