
import BookForm from '@/components/admin/books/BookForm';
import { getBookByIdFromDb } from '@/lib/book-service-firebase'; // Updated
import { notFound } from 'next/navigation';
import type { Book } from '@/data/books';

interface EditBookPageProps {
  params: { id: string };
}

export default async function EditBookPage({ params }: EditBookPageProps) {
  const { id } = params;
  let book: Book | null = null;
  let firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (firebaseConfigured) {
     book = await getBookByIdFromDb(id);
  } else {
    // If Firebase isn't configured, we can't fetch.
    // We could redirect or show an error message here.
    // For now, BookForm will handle the null book case if firebase is not configured.
  }


  if (firebaseConfigured && !book) {
    notFound(); // If Firebase is configured but book not found, then 404
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Edit Book</h1>
      <BookForm bookToEdit={book} bookId={id} />
    </div>
  );
}
