
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { handleSeedDatabase } from '@/lib/actions/bookActions';
import { Loader2, DatabaseBackup } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SeedDatabaseButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onSeed = async () => {
    setIsLoading(true);
    toast({ title: 'Seeding Database...', description: 'Please wait.' });
    const result = await handleSeedDatabase();
    if (result.success) {
      toast({ title: 'Success!', description: result.message });
    } else {
      toast({ title: 'Error Seeding Database', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DatabaseBackup className="mr-2 h-4 w-4" />
          )}
          Seed Database with Mock Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to seed the database?</AlertDialogTitle>
          <AlertDialogDescription>
            This will add books from the mock data file (`src/data/books.ts`) to your Firebase Firestore 'books' collection.
            If books with the same IDs already exist, they will be overwritten. This action is intended for initial setup or testing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onSeed} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600">
            {isLoading ? 'Seeding...' : 'Yes, Seed Database'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
