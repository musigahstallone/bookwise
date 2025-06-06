
'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Book } from '@/data/books';
import BookCard from '@/components/books/BookCard';
import { Input } from '@/components/ui/input';
import { Search, XCircle, ListFilter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaginationControls from './PaginationControls'; // New import

interface BookSearchClientProps {
  allBooks: Book[];
}

const BOOKS_PER_PAGE = 8;

export default function BookSearchClient({ allBooks }: BookSearchClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(allBooks.map(book => book.category));
    return ['all', ...Array.from(uniqueCategories).sort()];
  }, [allBooks]);

  const filteredBooks = useMemo(() => {
    let books = allBooks;

    if (selectedCategory !== 'all') {
      books = books.filter(book => book.category === selectedCategory);
    }

    if (searchTerm) {
      books = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return books;
  }, [allBooks, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    return filteredBooks.slice(startIndex, endIndex);
  }, [filteredBooks, currentPage]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when category changes
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search term changes
  }

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  }

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);


  return (
    <div>
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-10 py-3 text-base rounded-full shadow-sm focus:ring-primary focus:border-primary"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="relative">
           <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full md:w-[280px] rounded-full shadow-sm text-base py-3">
              <ListFilter className="h-5 w-5 text-muted-foreground mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {paginatedBooks.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {paginatedBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">No books found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

    