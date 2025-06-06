
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
import { Loader2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { storage } from '@/lib/firebase'; // Import Firebase storage
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const currentYear = new Date().getFullYear();

const bookFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  author: z.string().min(3, { message: 'Author must be at least 3 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Short description must be at least 10 characters.' }),
  longDescription: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  coverImageUrl: z.string().url({ message: 'Please enter a valid URL for the cover image.' }).default('https://placehold.co/300x300.png'),
  pdfUrl: z.string().url({ message: 'Please enter a valid URL for the PDF or upload a file.' }).optional().default('/pdfs/placeholder-book.pdf'),
  pdfFile: z.instanceof(File).optional().nullable(), // For file upload
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
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
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
      pdfFile: null,
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
            dataAiHint: book.dataAiHint || 'book cover',
            pdfFile: null, // Reset file input on load
        });
        if (book.pdfUrl && !book.pdfUrl.startsWith('/pdfs/placeholder-book.pdf')) {
            setFileName(book.pdfUrl.substring(book.pdfUrl.lastIndexOf('%2F') + 3, book.pdfUrl.indexOf('?')));
        }
      } else {
        toast({ title: 'Error', description: 'Book not found.', variant: 'destructive' });
        router.push('/admin/books');
      }
    }
  }, [bookId, isEditMode, form, router, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('pdfFile', file);
      setFileName(file.name);
      form.setValue('pdfUrl', ''); // Clear manual URL if file is chosen
    } else {
      form.setValue('pdfFile', null);
      setFileName(null);
    }
  };

  const onSubmit: SubmitHandler<BookFormValues> = async (data) => {
    setIsLoading(true);
    setIsUploading(false);
    let finalPdfUrl = data.pdfUrl || '/pdfs/placeholder-book.pdf';

    if (data.pdfFile) {
      setIsUploading(true);
      toast({ title: 'Uploading PDF...', description: 'Please wait while the PDF is being uploaded.' });
      try {
        const file = data.pdfFile;
        const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const fileRef = storageRef(storage, `book_pdfs/${uniqueFileName}`);
        await uploadBytes(fileRef, file);
        finalPdfUrl = await getDownloadURL(fileRef);
        toast({ title: 'Upload Successful', description: 'PDF uploaded to Firebase Storage.' });
      } catch (error) {
        console.error('Error uploading PDF:', error);
        toast({ title: 'Upload Failed', description: 'Could not upload PDF to Firebase. Please check console.', variant: 'destructive' });
        setIsLoading(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    // Ensure pdfUrl is not empty if no file was uploaded and no manual URL was provided
    if (!finalPdfUrl && !isEditMode) {
        finalPdfUrl = '/pdfs/placeholder-book.pdf';
    } else if (!finalPdfUrl && isEditMode) {
        // If editing and pdfUrl became empty (e.g. cleared manual url, no new file),
        // retain existing book's pdfUrl if available, or default.
        const existingBook = bookId ? getBookByIdAdmin(bookId) : undefined;
        finalPdfUrl = existingBook?.pdfUrl || '/pdfs/placeholder-book.pdf';
    }


    const bookDataToSave = { ...data, pdfUrl: finalPdfUrl };
    // Remove pdfFile from the data to be saved as it's not part of the Book type
    const { pdfFile, ...bookDataWithoutFile } = bookDataToSave;


    try {
      if (isEditMode && bookId) {
        updateBookAdmin(bookId, bookDataWithoutFile as Omit<Book, 'id'>);
        toast({ title: 'Success', description: 'Book updated successfully.' });
      } else {
        addBookAdmin(bookDataWithoutFile as Omit<Book, 'id'>);
        toast({ title: 'Success', description: 'Book added successfully.' });
      }
      router.push('/admin/books');
      router.refresh();
    } catch (error) {
      console.error('Form submission error:', error);
      toast({ title: 'Error', description: 'Something went wrong saving book data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {isEditMode ? 'Edit Book Details' : 'Add New Book'}
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
              name="pdfFile"
              render={({ field: { onChange, value, ...restField } }) => ( // Destructure onChange specifically
                <FormItem>
                  <FormLabel>Book PDF File</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                       <label htmlFor="pdf-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-input bg-background rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Choose PDF
                      </label>
                      <Input 
                        id="pdf-upload"
                        type="file" 
                        accept=".pdf"
                        onChange={handleFileChange} // Use custom handler
                        className="hidden"
                        {...restField}
                      />
                      {fileName && <span className="text-sm text-muted-foreground truncate max-w-xs">{fileName}</span>}
                    </div>
                  </FormControl>
                  <FormDescription>Upload the book's PDF file. This will be stored in Firebase Storage. Max 50MB recommended.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="pdfUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Or Enter PDF URL Manually</FormLabel>
                  <FormControl><Input placeholder="/pdfs/your-book.pdf OR https://existing-url.com/book.pdf" {...field} disabled={!!form.watch('pdfFile')} /></FormControl>
                  <FormDescription>If not uploading, you can provide a direct URL to the PDF. This field is disabled if a file is chosen for upload.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataAiHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Hint for Cover Image (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., fantasy dragon" {...field} /></FormControl>
                  <FormDescription>One or two keywords for AI image generation if applicable. Default: book cover</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => router.push('/admin/books')} disabled={isLoading || isUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isUploading} className="bg-primary hover:bg-primary/90">
                {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Uploading...' : (isEditMode ? 'Save Changes' : 'Add Book')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
