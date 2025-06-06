'use client';

import { useState, useMemo } from 'react';
import type { Book } from '@/data/books';
import BookCard from '@/components/books/BookCard';
import { Input } from '@/components/ui/input';
import { Search, XCircle } from 'lucide-react';

interface BookSearchClientProps {
  allBooks: Book[];
}

export default function BookSearchClient({ allBooks }: BookSearchClientProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBooks = useMemo(() => {
    if (!searchTerm) {
      return allBooks;
    }
    return allBooks.filter(book =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allBooks, searchTerm]);

  return (
    <div>
      <div className="mb-8 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 py-3 text-base rounded-full shadow-sm focus:ring-primary focus:border-primary"
        />
        {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
      </div>

      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">No books found matching your search.</p>
        </div>
      )}
    </div>
  );
}
