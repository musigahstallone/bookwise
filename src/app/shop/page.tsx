
import type { Book } from '@/data/books';
import { books } from '@/data/books';
import BookSearchClient from '@/components/books/BookSearchClient';

export default function ShopPage() {
  // In a real app, this data would come from an API
  const allBooks: Book[] = books;

  return (
    <div className="space-y-8">
      <section className="text-center py-8 bg-card rounded-lg shadow">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">Our Book Collection</h1>
        <p className="text-lg text-muted-foreground">Find your next adventure, one page at a time.</p>
      </section>
      
      <BookSearchClient allBooks={allBooks} />
    </div>
  );
}

    