
import BookForm from '@/components/admin/books/BookForm';

export default function AddBookPage() {
  const genkitAvailable = !!process.env.GOOGLE_API_KEY;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Add New Book</h1>
      <BookForm genkitAvailable={genkitAvailable} />
    </div>
  );
}
