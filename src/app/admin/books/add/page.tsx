
import BookForm from '@/components/admin/books/BookForm';

export default function AddBookPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Add New Book</h1>
      <BookForm />
    </div>
  );
}
