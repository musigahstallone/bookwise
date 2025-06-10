
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Book } from '@/data/books';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronRight, Edit, Trash2, BookOpen, Tag, DollarSign, CalendarDays, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import PaginationControls from '@/components/books/PaginationControls';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { handleDeleteBook } from '@/lib/actions/bookActions';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const BOOKS_PER_PAGE = 10;

interface AdminBookListClientProps {
  initialBooks: Book[];
}

export default function AdminBookListClient({ initialBooks }: AdminBookListClientProps) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'books'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedBooks: Book[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as Book;
      });
      setBooks(fetchedBooks);
      setError(null);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching books in real-time:", err);
      setError("Failed to fetch books in real-time.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setIsDetailViewOpen(true);
  };

  const handleDeleteRequest = (book: Book) => {
    setSelectedBook(book); 
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedBook) return;
    setIsDeleting(true);
    toast({ title: 'Deleting Book...', description: `Attempting to delete "${selectedBook.title}".` });
    
    const result = await handleDeleteBook(selectedBook.id, selectedBook.pdfUrl, selectedBook.coverImageUrl);

    if (result.success) {
      toast({ title: 'Success', description: result.message });
      const newBooksCount = books.length - 1;
      const newTotalPages = Math.ceil(newBooksCount / BOOKS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newBooksCount === 0) {
        setCurrentPage(1);
      }
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
    setIsDetailViewOpen(false); 
    setSelectedBook(null);
  };


  const totalPages = Math.ceil(books.length / BOOKS_PER_PAGE);
  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    return books.slice(startIndex, endIndex);
  }, [books, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isLoading && books.length === 0) {
     return ( <div className="space-y-3 mt-6">{[...Array(3)].map((_, i) => ( <div key={i} className="p-4 border rounded-lg shadow-sm bg-card flex gap-4"><Skeleton className="h-24 w-20 rounded" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/4" /></div></div>))}</div>);
  }
  if (error) return <div className="mt-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">{error}</div>;
  if (books.length === 0 && !isLoading) return <p className="mt-6 text-center text-muted-foreground">No books found. <Link href="/admin/books/add" className="text-primary hover:underline">Add a new book</Link>.</p>;

  const DetailViewContent = ({ book }: { book: Book }) => (
    <>
      <ScrollArea className="max-h-[70vh] sm:max-h-[80vh]">
        <div className="p-4 sm:p-6 space-y-4 text-sm">
          <div className="relative w-32 h-48 sm:w-full sm:aspect-[2/3] sm:max-w-xs mx-auto rounded-md overflow-hidden shadow-md mb-4">
            <Image src={book.coverImageUrl || 'https://placehold.co/300x450.png'} alt={book.title} layout="fill" objectFit="cover" data-ai-hint={book.dataAiHint || 'book cover detail'}/>
          </div>
          <h4 className="font-semibold text-xl text-primary text-center">{book.title}</h4>
          <p className="text-muted-foreground text-center">by {book.author}</p>
          <div className="border-t pt-3 mt-3 space-y-1">
            <p className="flex items-center"><Tag className="mr-2 h-4 w-4 text-muted-foreground"/><strong>Category:</strong> {book.category}</p>
            <p className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/><strong>Price:</strong> {formatCurrency(book.price, 'USD', 'US')}</p>
            <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/><strong>Published:</strong> {book.publishedYear}</p>
          </div>
           <div className="border-t pt-3 mt-3">
            <h5 className="font-medium mb-1">Description:</h5>
            <p className="text-muted-foreground whitespace-pre-line text-xs leading-relaxed">{book.description}</p>
          </div>
          {book.longDescription && ( <div className="border-t pt-3 mt-3"><h5 className="font-medium mb-1">Long Description:</h5><p className="text-muted-foreground whitespace-pre-line text-xs leading-relaxed">{book.longDescription}</p></div>)}
        </div>
      </ScrollArea>
      <div className="p-4 sm:p-6 border-t flex flex-col sm:flex-row gap-2">
        <Button asChild variant="outline" className="flex-1"><Link href={`/admin/books/edit/${book.id}`}><Edit className="mr-2 h-4 w-4"/> Edit Book</Link></Button>
        <Button variant="destructive" onClick={() => handleDeleteRequest(book)} className="flex-1" disabled={isDeleting}>{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>} Delete Book</Button>
      </div>
    </>
  );
  
  return (
    <>
      <div className="mt-6 space-y-3">{paginatedBooks.map((book) => (<div key={book.id} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card flex gap-4 items-start" onClick={() => handleBookClick(book)}><div className="w-16 h-24 sm:w-20 sm:h-28 relative flex-shrink-0 rounded overflow-hidden shadow"><Image src={book.coverImageUrl || 'https://placehold.co/80x120.png'} alt={book.title} layout="fill" objectFit="cover" data-ai-hint={book.dataAiHint || 'book cover small'}/></div><div className="flex-grow"><h3 className="font-semibold text-primary text-base sm:text-md line-clamp-2">{book.title}</h3><p className="text-xs text-muted-foreground">by {book.author}</p><p className="text-xs text-muted-foreground mt-0.5">Category: {book.category}</p><p className="text-sm font-medium text-foreground mt-1">{formatCurrency(book.price, 'USD', 'US')}</p></div><div className="self-center ml-auto"><ChevronRight className="h-5 w-5 text-muted-foreground"/></div></div>))}</div>
      {totalPages > 1 && (<PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange}/>)}
      {selectedBook && ( isMobileView ? ( <Drawer open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}><DrawerContent className="max-h-[85vh]"><DrawerHeader className="text-left"><DrawerTitle>Book Details</DrawerTitle><DrawerDescription className="line-clamp-1">{selectedBook.title}</DrawerDescription></DrawerHeader><DetailViewContent book={selectedBook} /><DrawerFooter className="pt-2"><DrawerClose asChild><Button variant="outline">Close</Button></DrawerClose></DrawerFooter></DrawerContent></Drawer>) : ( <Sheet open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}><SheetContent className="sm:max-w-md w-full flex flex-col"><SheetHeader><SheetTitle>Book Details</SheetTitle><SheetDescription className="line-clamp-1">{selectedBook.title}</SheetDescription></SheetHeader><div className="flex-grow overflow-hidden"><DetailViewContent book={selectedBook} /></div><SheetFooter className="pt-2 mt-auto"><SheetClose asChild><Button variant="outline">Close</Button></SheetClose></SheetFooter></SheetContent></Sheet>) )}
      {selectedBook && (<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the book "{selectedBook.title}" and its associated files (PDF, Cover Image) from Firebase Storage. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </>
  );
}
