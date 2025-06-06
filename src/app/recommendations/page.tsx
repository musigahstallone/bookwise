import AIRecommenderClient from '@/components/ai/AIRecommenderClient';
import { books } from '@/data/books';
import { Sparkles } from 'lucide-react';

export default function RecommendationsPage() {
  const bookDescriptionsForAI = books.map(book => ({
    title: book.title,
    description: book.longDescription || book.description,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">AI Book Recommender</h1>
        <p className="text-lg text-muted-foreground">
          Tell us what you're in the mood for, and our AI will suggest the perfect book!
        </p>
      </div>
      <AIRecommenderClient bookCatalog={bookDescriptionsForAI} allBooks={books} />
    </div>
  );
}
