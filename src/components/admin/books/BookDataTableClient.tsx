
'use client';

import { useState, useEffect, useMemo } from 'react';
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

export default function BookDataTableClient() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = () => {
    setIsLoading(true);
    // Simulate API call delay if needed, but direct service call is fine for now
    setBooks(getAllBooksAdmin());
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
      setBooks(prevBooks => prevBooks.filter(b => b.id !== bookToDelete!.id)); // Update local state immediately
      // router.refresh(); // This can help re-sync if there are server-side aspects
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete book.', variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
      setBookToDelete(null);
    }
  };

  const sortedBooks = useMemo(() => {
    return [...books].sort((a,b) => a.title.localeCompare(b.title));
  }, [books]);


  if (isLoading) {
    return <p>Loading books...</p>;
  }

  if (sortedBooks.length === 0) {
    return <p>No books found. <Link href="/admin/books/add" className="text-primary hover:underline">Add a new book</Link>.</p>;
  }

  return (
    <>
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                   <Image src={book.coverImageUrl || 'https://placehold.co/50x50.png'} alt={book.title} width={40} height={40} className="rounded object-cover aspect-square" data-ai-hint={book.dataAiHint || 'book cover small'}/>
                </TableCell>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>{book.category}</TableCell>
                <TableCell className="text-right">${book.price.toFixed(2)}</TableCell>
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
