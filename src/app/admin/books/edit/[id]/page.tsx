
import BookForm from '@/components/admin/books/BookForm';

interface EditBookPageProps {
  params: { id: string };
}

export default function EditBookPage({ params }: EditBookPageProps) {
  const { id } = params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Edit Book</h1>
      <BookForm bookId={id} />
    </div>
  );
}
