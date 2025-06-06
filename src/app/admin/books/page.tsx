
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import BookDataTableClient from '@/components/admin/books/BookDataTableClient'; // Renamed for clarity

export default function ManageBooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Manage Books</h1>
            <p className="text-muted-foreground">Add, edit, or delete books from the catalog.</p>
        </div>
        <Button asChild>
          <Link href="/admin/books/add">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Book
          </Link>
        </Button>
      </div>
      <BookDataTableClient />
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold">Developer Note:</p>
        <p>Book data modifications made here are for the current session only and will not persist across server restarts or application rebuilds due to the lack of a backend database in this prototype.</p>
      </div>
    </div>
  );
}
