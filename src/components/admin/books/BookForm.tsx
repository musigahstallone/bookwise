
'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { Book } from '@/data/books';
import { addBookAdmin, updateBookAdmin, getBookByIdAdmin } from '@/lib/book-service';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const currentYear = new Date().getFullYear();

const bookFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  author: z.string().min(3, { message: 'Author must be at least 3 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Short description must be at least 10 characters.' }),
  longDescription: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  coverImageUrl: z.string().url({ message: 'Please enter a valid URL for the cover image.' }).default('https://placehold.co/300x300.png'),
  pdfUrl: z.string().url({ message: 'Please enter a valid URL for the PDF.' }).default('/pdfs/placeholder-book.pdf'),
  dataAiHint: z.string().optional().default('book cover'),
  publishedYear: z.coerce.number().int().min(1000, { message: 'Enter a valid year.' }).max(currentYear + 5, { message: `Year cannot be too far in the future.`}),
});

export type BookFormValues = z.infer<typeof bookFormSchema>;

interface BookFormProps {
  bookId?: string; // If provided, it's an edit form
}

export default function BookForm({ bookId }: BookFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!bookId;

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: '',
      author: '',
      category: '',
      description: '',
      longDescription: '',
      price: 0,
      coverImageUrl: 'https://placehold.co/300x300.png',
      pdfUrl: '/pdfs/placeholder-book.pdf',
      dataAiHint: 'book cover',
      publishedYear: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    if (isEditMode && bookId) {
      const book = getBookByIdAdmin(bookId);
      if (book) {
        form.reset({
            ...book,
            longDescription: book.longDescription || '',
            dataAiHint: book.dataAiHint || 'book cover'
        });
      } else {
        toast({ title: 'Error', description: 'Book not found.', variant: 'destructive' });
        router.push('/admin/books');
      }
    }
  }, [bookId, isEditMode, form, router, toast]);

  const onSubmit: SubmitHandler<BookFormValues> = async (data) => {
    setIsLoading(true);
    try {
      if (isEditMode && bookId) {
        updateBookAdmin(bookId, data);
        toast({ title: 'Success', description: 'Book updated successfully.' });
      } else {
        addBookAdmin(data);
        toast({ title: 'Success', description: 'Book added successfully.' });
      }
      router.push('/admin/books');
      router.refresh(); // Helps ensure the table on the previous page updates
    } catch (error) {
      console.error('Form submission error:', error);
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {isEditMode ? 'Edit Book' : 'Add New Book'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Book Title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl><Input placeholder="Author Name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl><Input placeholder="e.g., Fiction, Science" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Description</FormLabel>
                  <FormControl><Textarea placeholder="A brief summary of the book..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Long Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="A more detailed description..." rows={5} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 19.99" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="publishedYear"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Published Year</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 2023" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image URL</FormLabel>
                  <FormControl><Input placeholder="https://example.com/cover.jpg" {...field} /></FormControl>
                  <FormDescription>Use a square image (e.g., 300x300) for best results. Default: https://placehold.co/300x300.png</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pdfUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PDF URL</FormLabel>
                  <FormControl><Input placeholder="/pdfs/your-book.pdf" {...field} /></FormControl>
                  <FormDescription>Link to the downloadable PDF. Default: /pdfs/placeholder-book.pdf</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataAiHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Hint for Image (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., fantasy dragon" {...field} /></FormControl>
                  <FormDescription>One or two keywords for AI image generation if applicable. Default: book cover</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-3 justify-end">
              <Button type="button" variant="outline" onClick={() => router.push('/admin/books')} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Add Book'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
