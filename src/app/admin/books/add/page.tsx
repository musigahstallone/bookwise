
import BookForm from '@/components/admin/books/BookForm';
import { isGenkitConfigured } from '@/ai/genkit';

export default function AddBookPage() {
  const genkitAvailable = isGenkitConfigured;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Add New Book</h1>
      <BookForm genkitAvailable={genkitAvailable} />
    </div>
  );
}
