
'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { User } from '@/data/users';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useEffect, useState as ReactUseState } from 'react'; // aliasing to avoid conflict if any other local useState
import { handleUpdateUser } from '@/lib/actions/userActions';

const userFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }), // Email typically not editable here once set
  role: z.enum(['user', 'admin'], { required_error: 'Role is required.' }),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  userToEdit?: User | null;
  userId?: string; // Firebase UID
  firebaseConfigured: boolean;
}

export default function UserForm({ userToEdit, userId, firebaseConfigured }: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = ReactUseState(false); // Using alias

  const isEditMode = !!userId && !!userToEdit;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: userToEdit?.name || '',
      email: userToEdit?.email || '',
      role: userToEdit?.role || 'user',
    },
  });

  useEffect(() => {
    if (userToEdit) {
      form.reset({
        name: userToEdit.name,
        email: userToEdit.email, // Display email, but it's read-only
        role: userToEdit.role,
      });
    }
  }, [userToEdit, form]);

  const onSubmit: SubmitHandler<UserFormValues> = async (data) => {
    if (!firebaseConfigured) {
        toast({ title: 'Configuration Error', description: 'Firebase is not configured. Cannot save user.', variant: 'destructive' });
        return;
    }
    if (!isEditMode || !userId) {
        toast({ title: 'Error', description: 'Cannot update user without a valid ID.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    
    // Prepare only the fields that should be updated (name and role)
    const updateData: Partial<Pick<User, 'name' | 'role'>> = {
        name: data.name,
        role: data.role,
    };

    const result = await handleUpdateUser(userId, updateData);

    if (result.success) {
      toast({ title: 'Success', description: result.message });
      router.push('/admin/users');
      router.refresh(); 
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  if (!firebaseConfigured && !isEditMode) { // Should not happen if page loads
    return (
         <Card className="shadow-xl bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</CardTitle>
            </CardHeader>
            <CardContent><p className="text-destructive-foreground">Cannot proceed.</p></CardContent>
        </Card>
    );
  }
   if (isEditMode && !userToEdit && firebaseConfigured) { // Should be caught by notFound on page
    return (
        <Card className="shadow-xl"><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>User not found.</p></CardContent></Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {isEditMode ? `Edit User: ${userToEdit?.name || userToEdit?.email}` : 'Add New User (Not Implemented)'}
        </CardTitle>
        {!firebaseConfigured && isEditMode && (
             <CardDescription className="text-destructive flex items-center gap-1 pt-2">
                <AlertTriangle size={16}/> Firebase not configured. Changes might not save correctly.
            </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isEditMode && userToEdit ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="User's full name" {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address (Read-only)</FormLabel>
                    <FormControl><Input placeholder="user@example.com" {...field} readOnly disabled className="bg-muted/50" /></FormControl>
                    <FormDescription>Email cannot be changed after account creation.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Assign user role (Admin role grants access to this panel).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !firebaseConfigured} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        ) : (
            <p>User data could not be loaded or adding new users manually is not supported via this form. Users are created via the signup page.</p>
        )}
      </CardContent>
    </Card>
  );
}
