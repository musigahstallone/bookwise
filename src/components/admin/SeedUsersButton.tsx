
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { handleSeedUsers } from '@/lib/actions/userActions'; // Ensure this path is correct
import { Loader2, Users } from 'lucide-react';
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

export default function SeedUsersButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onSeed = async () => {
    setIsLoading(true);
    toast({ title: 'Seeding Users...', description: 'Please wait.' });
    const result = await handleSeedUsers();
    if (result.success) {
      toast({ title: 'Success!', description: result.message });
    } else {
      toast({ title: 'Error Seeding Users', description: result.message, variant: 'destructive' });
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
            <Users className="mr-2 h-4 w-4" />
          )}
          Seed User Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to seed user data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will add mock users from `src/data/users.ts` to your Firebase Firestore 'users' collection.
            If users with the same IDs already exist, they will be overwritten. This is for testing purposes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onSeed} disabled={isLoading} className="bg-blue-500 hover:bg-blue-600">
            {isLoading ? 'Seeding...' : 'Yes, Seed Users'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
