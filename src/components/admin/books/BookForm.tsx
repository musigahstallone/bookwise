
'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { Book } from '@/data/books';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, AlertTriangle, ImagePlus, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { handleAddBook, handleUpdateBook } from '@/lib/actions/bookActions';
import Image from 'next/image';

const currentYear = new Date().getFullYear();

const bookFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  author: z.string().min(3, { message: 'Author must be at least 3 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Short description must be at least 10 characters.' }),
  longDescription: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  pdfFile: z.instanceof(File).optional().nullable(),
  coverImageFile: z.instanceof(File).optional().nullable(),
  dataAiHint: z.string().max(50, "AI Hint too long. Max 2 words recommended.").optional().default('book cover'),
  publishedYear: z.coerce.number().int().min(1000, { message: 'Enter a valid year.' }).max(currentYear + 5, { message: `Year cannot be too far in the future.`}),
});

export type BookFormValues = z.infer<typeof bookFormSchema>;

interface BookFormProps {
  bookToEdit?: Book | null;
  bookId?: string;
}

export default function BookForm({ bookToEdit, bookId }: BookFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState<string | null>(null);
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState<string | null>(bookToEdit?.coverImageUrl || 'https://placehold.co/300x300.png');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);


  const isEditMode = !!bookId && !!bookToEdit;
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: bookToEdit ? {
        ...bookToEdit,
        longDescription: bookToEdit.longDescription || '',
        dataAiHint: bookToEdit.dataAiHint || 'book cover',
        pdfFile: null,
        coverImageFile: null,
      } : {
      title: '',
      author: '',
      category: '',
      description: '',
      longDescription: '',
      price: 0,
      pdfFile: null,
      coverImageFile: null,
      dataAiHint: 'book cover',
      publishedYear: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    if (isEditMode && bookToEdit) {
      form.reset({
        ...bookToEdit,
        longDescription: bookToEdit.longDescription || '',
        dataAiHint: bookToEdit.dataAiHint || 'book cover',
        pdfFile: null,
        coverImageFile: null,
      });
      setCurrentCoverImageUrl(bookToEdit.coverImageUrl || 'https://placehold.co/300x300.png');
      setCoverPreviewUrl(null); // Clear file preview when resetting form for edit

      if (bookToEdit.pdfUrl && bookToEdit.pdfUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const url = new URL(bookToEdit.pdfUrl);
          const pathParts = url.pathname.split('/');
          const encodedFileName = pathParts[pathParts.length - 1];
          const decodedFileNameWithFolder = decodeURIComponent(encodedFileName);
          const actualFileName = decodedFileNameWithFolder.substring(decodedFileNameWithFolder.indexOf('/') + 1);
          setPdfFileName(actualFileName.split('?')[0]);
        } catch (e) { setPdfFileName('Uploaded PDF'); }
      } else {
        setPdfFileName(null);
      }

      if (bookToEdit.coverImageUrl && bookToEdit.coverImageUrl.includes('firebasestorage.googleapis.com')) {
         try {
          const url = new URL(bookToEdit.coverImageUrl);
          const pathParts = url.pathname.split('/');
          const encodedFileName = pathParts[pathParts.length - 1];
          const decodedFileNameWithFolder = decodeURIComponent(encodedFileName);
          const actualFileName = decodedFileNameWithFolder.substring(decodedFileNameWithFolder.indexOf('/') + 1);
          setCoverFileName(actualFileName.split('?')[0] || 'Uploaded Cover');
        } catch (e) { setCoverFileName('Uploaded Cover'); }
      } else {
        setCoverFileName(null);
      }

    } else {
        setCurrentCoverImageUrl('https://placehold.co/300x300.png');
        setCoverPreviewUrl(null);
        setPdfFileName(null);
        setCoverFileName(null);
    }
  }, [bookId, isEditMode, bookToEdit, form]);


  const handlePdfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('pdfFile', file);
      setPdfFileName(file.name);
    } else {
      form.setValue('pdfFile', null);
      setPdfFileName(isEditMode && bookToEdit?.pdfUrl ? 'Using existing PDF' : null);
    }
  };

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('coverImageFile', file);
      setCoverFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('coverImageFile', null);
      setCoverFileName(isEditMode && bookToEdit?.coverImageUrl ? 'Using existing cover' : null);
      setCoverPreviewUrl(null); // Clear preview if file is removed
    }
  };
  
  const uploadFileToStorage = async (file: File, pathPrefix: string): Promise<string> => {
    const safeFileName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const uniqueFileName = `${pathPrefix}/${Date.now()}-${safeFileName}`;
    const fileRef = storageRef(storage, uniqueFileName);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };


  const onSubmit: SubmitHandler<BookFormValues> = async (data) => {
    if (!firebaseConfigured) {
        toast({ title: 'Configuration Error', description: 'Firebase is not configured. Cannot save book.', variant: 'destructive' });
        return;
    }
    setIsLoading(true);
    let finalPdfUrl = isEditMode ? bookToEdit?.pdfUrl : '/pdfs/placeholder-book.pdf';
    let finalCoverImageUrl = isEditMode ? bookToEdit?.coverImageUrl : 'https://placehold.co/300x300.png';

    // Upload PDF
    if (data.pdfFile) {
      setIsUploadingPdf(true);
      toast({ title: 'Uploading PDF...', description: 'Please wait.' });
      try {
        finalPdfUrl = await uploadFileToStorage(data.pdfFile, 'book_pdfs');
        toast({ title: 'PDF Upload Successful', description: 'PDF ready.' });
      } catch (error) {
        console.error('Error uploading PDF:', error);
        toast({ title: 'PDF Upload Failed', description: String(error), variant: 'destructive' });
        setIsLoading(false); setIsUploadingPdf(false);
        return;
      }
      setIsUploadingPdf(false);
    }

    // Upload Cover Image
    if (data.coverImageFile) {
      setIsUploadingCover(true);
      toast({ title: 'Uploading Cover Image...', description: 'Please wait.' });
      try {
        finalCoverImageUrl = await uploadFileToStorage(data.coverImageFile, 'book_covers');
        toast({ title: 'Cover Image Upload Successful', description: 'Cover image ready.' });
      } catch (error) {
        console.error('Error uploading cover image:', error);
        toast({ title: 'Cover Image Upload Failed', description: String(error), variant: 'destructive' });
        setIsLoading(false); setIsUploadingCover(false);
        return;
      }
      setIsUploadingCover(false);
    }
    
    const bookDataForAction = {
      ...data,
      pdfUrl: finalPdfUrl!, // Assert non-null as it will have a default or uploaded value
      coverImageUrl: finalCoverImageUrl!, // Assert non-null
    };
    
    const { pdfFile, coverImageFile, ...actionPayload } = bookDataForAction;

    let result;
    if (isEditMode && bookId) {
      result = await handleUpdateBook(bookId, actionPayload as Partial<Omit<Book, 'id'>>);
    } else {
      result = await handleAddBook(actionPayload as Omit<Book, 'id'>);
    }

    if (result.success) {
      toast({ title: 'Success', description: result.message });
      router.push('/admin/books');
      router.refresh(); 
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  if (!firebaseConfigured && !isEditMode) {
    return (
         <Card className="shadow-xl bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive-foreground">
                Cannot add a new book because Firebase is not configured. Please set up your <code>.env.local</code> file.
                </p>
                 <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
            </CardContent>
        </Card>
    );
  }
   if (isEditMode && !bookToEdit && firebaseConfigured) {
    return (
        <Card className="shadow-xl">
            <CardHeader><CardTitle>Error</CardTitle></CardHeader>
            <CardContent><p>Book not found or could not be loaded for editing.</p></CardContent>
        </Card>
    );
  }

  const displayCoverUrl = coverPreviewUrl || currentCoverImageUrl;

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {isEditMode ? 'Edit Book Details' : 'Add New Book'}
        </CardTitle>
        {!firebaseConfigured && isEditMode && (
             <CardDescription className="text-destructive flex items-center gap-1 pt-2">
                <AlertTriangle size={16}/> Firebase not configured. Changes might not save correctly.
            </CardDescription>
        )}
         {firebaseConfigured && (
             <CardDescription className="pt-2 text-sm text-muted-foreground">
                {isEditMode && bookToEdit ? `Modifying: ${bookToEdit.title}` : 'Upload book PDF and cover image directly.'}
            </CardDescription>
        )}
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
                  <FormControl><Textarea placeholder="A more detailed description..." rows={5} {...field} value={field.value ?? ''} /></FormControl>
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
              name="coverImageFile"
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Cover Image File</FormLabel>
                   {displayCoverUrl && (
                    <div className="mt-2 mb-2 w-32 h-32 relative border rounded overflow-hidden">
                      <Image src={displayCoverUrl} alt="Cover preview" layout="fill" objectFit="cover" data-ai-hint="book cover form preview"/>
                    </div>
                  )}
                  <FormControl>
                    <div className="flex items-center space-x-2">
                       <label htmlFor="cover-image-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-input bg-background rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
                        <ImagePlus className="mr-2 h-4 w-4" />
                        {coverFileName ? 'Change Cover' : 'Choose Cover Image'}
                      </label>
                      <Input 
                        id="cover-image-upload"
                        type="file" 
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleCoverFileChange}
                        className="hidden"
                      />
                      {coverFileName && <span className="text-sm text-muted-foreground truncate max-w-xs">{coverFileName}</span>}
                    </div>
                  </FormControl>
                  <FormDescription>Upload the book's cover image (PNG, JPG, WEBP). Square images (e.g., 300x300) work best. Max 5MB recommended.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="pdfFile"
              render={() => ( 
                <FormItem>
                  <FormLabel>Book PDF File</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                       <label htmlFor="pdf-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-input bg-background rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
                        <FileText className="mr-2 h-4 w-4" />
                        {pdfFileName ? 'Change PDF' : 'Choose PDF'}
                      </label>
                      <Input 
                        id="pdf-upload"
                        type="file" 
                        accept=".pdf"
                        onChange={handlePdfFileChange}
                        className="hidden"
                      />
                      {pdfFileName && <span className="text-sm text-muted-foreground truncate max-w-xs">{pdfFileName}</span>}
                    </div>
                  </FormControl>
                  <FormDescription>Upload the book's PDF file. This will be stored in Firebase Storage. Max 50MB recommended.</FormDescription>
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
                  <FormControl><Input placeholder="e.g., fantasy dragon" {...field} value={field.value ?? ''} /></FormControl>
                  <FormDescription>One or two keywords for AI image generation if applicable (max 2 words). Default: book cover</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading || isUploadingPdf || isUploadingCover}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isUploadingPdf || isUploadingCover || !firebaseConfigured} className="bg-primary hover:bg-primary/90">
                {(isLoading || isUploadingPdf || isUploadingCover) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploadingPdf ? 'Uploading PDF...' : isUploadingCover ? 'Uploading Cover...' : (isEditMode ? 'Save Changes' : 'Add Book')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
