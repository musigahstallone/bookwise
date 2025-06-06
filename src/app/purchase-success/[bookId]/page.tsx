import { getBookById } from '@/data/books';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, Download } from 'lucide-react';
import {notFound} from 'next/navigation';

interface PurchaseSuccessPageProps {
  params: { bookId: string };
}

export default function PurchaseSuccessPage({ params }: PurchaseSuccessPageProps) {
  const book = getBookById(params.bookId);

  if (!book) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
      <h1 className="text-4xl font-headline font-bold text-primary mb-4">Purchase Successful!</h1>
      <p className="text-lg text-muted-foreground mb-2">
        Thank you for purchasing <span className="font-semibold text-foreground">{book.title}</span>.
      </p>
      <p className="text-md text-muted-foreground mb-8">
        You can now download your PDF copy.
      </p>
      
      <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
        <a href={book.pdfUrl} download={`${book.title.replace(/\s+/g, '_')}.pdf`}>
          <Download className="mr-2 h-5 w-5" />
          Download PDF
        </a>
      </Button>

      <Button variant="link" asChild className="mt-10">
        <Link href="/">Continue Shopping</Link>
      </Button>
    </div>
  );
}

export async function generateStaticParams() {
  const { books } = await import('@/data/books');
  return books.map((book) => ({
    bookId: book.id,
  }));
}
