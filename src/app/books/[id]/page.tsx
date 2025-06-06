
import { getBookById, type Book } from '@/data/books';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import { ShoppingCart, Download, ArrowLeft } from 'lucide-react';
import BuyButtonClient from '@/components/books/BuyButtonClient';

interface BookDetailsPageProps {
  params: { id: string };
}

export default function BookDetailsPage({ params }: BookDetailsPageProps) {
  const book = getBookById(params.id);

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
            <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-md">
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
              <CardDescription className="text-lg text-muted-foreground">By {book.author}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-2xl font-bold text-primary mb-4">${book.price.toFixed(2)}</p>
              <Separator className="my-4" />
              <h3 className="text-xl font-semibold mb-2 font-headline">Description</h3>
              <p className="text-base leading-relaxed mb-6 whitespace-pre-line">
                {book.longDescription || book.description}
              </p>
              <BuyButtonClient bookId={book.id} bookTitle={book.title} />
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}

export async function generateStaticParams() {
  const { books } = await import('@/data/books');
  return books.map((book) => ({
    id: book.id,
  }));
}

    