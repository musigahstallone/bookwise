
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Book } from '@/data/books';
import { getAllBooksAdmin, deleteBookAdmin } from '@/lib/book-service';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';
import PaginationControls from '@/components/books/PaginationControls'; // Reusing from shop

const BOOKS_PER_PAGE = 10; // Admin can see more per page

export default function BookDataTableClient() {
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = () => {
    setIsLoading(true);
    setAllBooks(getAllBooksAdmin());
    setIsLoading(false);
  };

  const handleDeleteConfirmation = (book: Book) => {
    setBookToDelete(book);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBook = () => {
    if (!bookToDelete) return;
    try {
      deleteBookAdmin(bookToDelete.id);
      toast({ title: 'Success', description: `"${bookToDelete.title}" deleted successfully.` });
      setAllBooks(prevBooks => prevBooks.filter(b => b.id !== bookToDelete!.id)); 
      // Adjust current page if the last item on a page was deleted
      const newTotalPages = Math.ceil((allBooks.length - 1) / BOOKS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newTotalPages === 0) {
        setCurrentPage(1);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete book.', variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
      setBookToDelete(null);
    }
  };

  const sortedBooks = useMemo(() => {
    return [...allBooks].sort((a,b) => a.title.localeCompare(b.title));
  }, [allBooks]);

  const totalPages = Math.ceil(sortedBooks.length / BOOKS_PER_PAGE);

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    return sortedBooks.slice(startIndex, endIndex);
  }, [sortedBooks, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);


  if (isLoading) {
    return <p>Loading books...</p>;
  }

  if (sortedBooks.length === 0) {
    return <p>No books found. <Link href="/admin/books/add" className="text-primary hover:underline">Add a new book</Link>.</p>;
  }

  return (
    <>
      <div className="rounded-md border shadow-sm overflow-x-auto"> {/* Added overflow-x-auto for mobile table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] sm:w-[80px]">Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Author</TableHead>
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
              <TableHead className="text-center w-[80px] sm:w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                   <Image 
                     src={book.coverImageUrl || 'https://placehold.co/50x50.png'} 
                     alt={book.title} 
                     width={40} 
                     height={40} 
                     className="rounded object-cover aspect-square" 
                     data-ai-hint={book.dataAiHint || 'book cover small'}
                   />
                </TableCell>
                <TableCell className="font-medium">
                  {book.title}
                  <div className="text-xs text-muted-foreground md:hidden">{book.author}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">${book.price.toFixed(2)}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{book.author}</TableCell>
                <TableCell className="hidden lg:table-cell">{book.category}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">${book.price.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/books/edit/${book.id}`} className="flex items-center cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteConfirmation(book)} className="flex items-center text-destructive hover:!text-destructive cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
        />
      )}

      {bookToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the book
                "{bookToDelete.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteBook} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
