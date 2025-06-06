import BookCard from '@/components/books/BookCard';
import { books, type Book } from '@/data/books';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import BookSearchClient from '@/components/books/BookSearchClient';

export default function HomePage() {
  // In a real app, this data would come from an API
  const allBooks: Book[] = books;

  return (
    <div className="space-y-8">
      <section className="text-center py-8 bg-card rounded-lg shadow">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">Welcome to BookWise</h1>
        <p className="text-lg text-muted-foreground">Find your next adventure, one page at a time.</p>
      </section>
      
      <BookSearchClient allBooks={allBooks} />
    </div>
  );
}
