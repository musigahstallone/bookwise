
'use client';

import { useParams, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { books as allBooks, getBooksByAuthor, type Book } from '@/data/books';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, UserCircle } from 'lucide-react';

export default function AuthorPage() {
  const params = useParams<{ authorName: string }>();
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [authorBooks, setAuthorBooks] = useState<Book[]>([]);

  useEffect(() => {
    if (params.authorName) {
      const decodedAuthorName = decodeURIComponent(params.authorName as string);
      setAuthorName(decodedAuthorName);
      const booksByAuthor = getBooksByAuthor(decodedAuthorName);
      
      // Check if the author exists by seeing if they have any books or if their name is in any book's author field
      const authorExists = allBooks.some(book => book.author.toLowerCase() === decodedAuthorName.toLowerCase());

      if (!authorExists) {
        // No books by this author, or author not found in our data
        // We could show a "author not found" message, or redirect to 404
        // For now, if no books are found by this author, but the author name *might* be valid (e.g. if they had no books in *our* store)
        // we might still want to show the page with a "no books found" message.
        // However, if the author name itself is not found in *any* book, it's a clear 404.
        // This logic could be refined based on how "author existence" is defined.
        // For simplicity, if `getBooksByAuthor` returns empty AND no book has this author, it's a 404.
        // The current `getBooksByAuthor` would return empty if no books. We need to ensure `authorExists` is the primary check.
        if (!authorExists && booksByAuthor.length === 0) {
            // This scenario is a bit tricky. If `authorExists` is true, `booksByAuthor` should not be empty.
            // If `authorExists` is false, `booksByAuthor` will be empty.
            // So, simply checking `!authorExists` should be enough for a 404 if author truly doesn't exist in our catalog.
             notFound(); 
             return;
        }

      }
      setAuthorBooks(booksByAuthor);


    }
  }, [params.authorName]);

  if (!authorName) {
    return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <p>Loading author details...</p>
      </div>
    );
  }
  
  // This explicit notFound call might be redundant if the useEffect logic correctly calls it.
  // But it's a safeguard if authorName is set but no books were found AND author shouldn't exist.
  // The `getBooksByAuthor` function would return an empty array if no books are found.
  // A better check for 404 might be if `authorName` is valid but `getBooksByAuthor` returns empty
  // AND the author is not listed in any book (which `authorExists` checks).
  // The previous `useEffect` handles the primary `notFound()` call.

  return (
    <div className="max-w-5xl mx-auto">
      <Button variant="outline" asChild className="mb-6 group">
        <Link href="/shop">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Shop
        </Link>
      </Button>

      <div className="text-center mb-10">
        <UserCircle className="mx-auto h-20 w-20 text-primary mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary">{authorName}</h1>
        {/* Placeholder for author bio - could be added to data/books.ts or a new data source later */}
        {/* <p className="text-lg text-muted-foreground mt-2">Brief bio about {authorName}...</p> */}
      </div>

      {authorBooks.length > 0 ? (
        <>
          <h2 className="text-2xl font-headline font-semibold text-foreground mb-6">Books by {authorName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {authorBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-center text-lg text-muted-foreground py-10">
          No books by {authorName} found in our catalog at this time.
        </p>
      )}
    </div>
  );
}

// It's generally better to avoid generateStaticParams for pages that heavily rely on dynamic client-side data
// or if the number of params is very large or unknown at build time.
// For authors, since their existence depends on the `books` data which might change, dynamic rendering is safer.
// export async function generateStaticParams() {
//   const uniqueAuthors = new Set(allBooks.map(book => book.author));
//   return Array.from(uniqueAuthors).map(author => ({
//     authorName: encodeURIComponent(author),
//   }));
// }
