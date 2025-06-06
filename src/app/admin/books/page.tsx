
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import BookDataTableClient from '@/components/admin/books/BookDataTableClient';
import { getAllBooksFromDb } from '@/lib/book-service-firebase'; // Updated import
import type { Book } from '@/data/books';

export default async function ManageBooksPage() {
  let books: Book[] = [];
  let firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let fetchError: string | null = null;

  if (firebaseConfigured) {
    try {
      books = await getAllBooksFromDb();
    } catch (error) {
      console.error("Error fetching books for admin page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching books.";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Manage Books</h1>
            <p className="text-muted-foreground">Add, edit, or delete books from the Firebase Firestore database.</p>
        </div>
        <Button asChild disabled={!firebaseConfigured}>
          <Link href="/admin/books/add">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Book
          </Link>
        </Button>
      </div>

      {!firebaseConfigured && (
         <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
            <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</p>
            <p>Book management requires Firebase to be configured. Please check your <code>.env.local</code> settings and ensure Firebase services are enabled.</p>
        </div>
      )}

      {firebaseConfigured && fetchError && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
            <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Error Fetching Books</p>
            <p>{fetchError}</p>
        </div>
      )}
      
      {firebaseConfigured && !fetchError && <BookDataTableClient initialBooks={books} />}
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold">Developer Note:</p>
        <p>Book data modifications made here now directly interact with Firebase Firestore. PDF files are stored in Firebase Storage.</p>
      </div>
    </div>
  );
}
