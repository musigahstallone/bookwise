'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getBookRecommendation, type BookRecommendationOutput, type BookRecommendationInput } from '@/ai/flows/book-recommendation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, BookHeart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Book } from '@/data/books';

const formSchema = z.object({
  userInput: z.string().min(10, { message: 'Please describe your preferences in at least 10 characters.' }),
});

type AIRecommenderFormValues = z.infer<typeof formSchema>;

interface AIRecommenderClientProps {
  bookCatalog: BookRecommendationInput['bookDescriptions'];
  allBooks: Book[]; // To get cover images and links
}

export default function AIRecommenderClient({ bookCatalog, allBooks }: AIRecommenderClientProps) {
  const [recommendations, setRecommendations] = useState<BookRecommendationOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AIRecommenderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userInput: '',
    },
  });

  const onSubmit: SubmitHandler<AIRecommenderFormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const result = await getBookRecommendation({
        userInput: data.userInput,
        bookDescriptions: bookCatalog,
      });
      setRecommendations(result);
    } catch (e) {
      console.error('Error getting recommendations:', e);
      setError('Sorry, something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const findBookDetails = (title: string) => {
    return allBooks.find(b => b.title === title);
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <BookHeart className="mr-2 h-6 w-6 text-primary" />
          Find Your Next Read
        </CardTitle>
        <CardDescription>
          Describe your mood, preferred genres, or a book you liked, and let our AI find suggestions for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="userInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Your Preferences</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'I'm looking for a fast-paced thriller with a strong female lead' or 'I'm feeling adventurous and want a fantasy epic.'"
                      className="min-h-[120px] text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} size="lg" className="w-full md:w-auto bg-primary hover:bg-primary/90">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" />
              )}
              Get Recommendations
            </Button>
          </form>
        </Form>

        {error && (
          <div className="mt-6 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">
            {error}
          </div>
        )}

        {recommendations && recommendations.recommendedBooks.length > 0 && (
          <div className="mt-8 space-y-6">
            <h3 className="text-2xl font-headline font-semibold text-primary">Our Suggestions For You:</h3>
            {recommendations.recommendedBooks.map((rec, index) => {
              const bookDetail = findBookDetails(rec.title);
              return (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    {bookDetail && (
                      <div className="w-full sm:w-1/4 flex-shrink-0">
                        <Link href={`/books/${bookDetail.id}`}>
                          <div className="aspect-[2/3] relative rounded overflow-hidden cursor-pointer">
                            <Image
                              src={bookDetail.coverImageUrl}
                              alt={bookDetail.title}
                              layout="fill"
                              objectFit="cover"
                              data-ai-hint={bookDetail.dataAiHint || 'book recommendation'}
                            />
                          </div>
                        </Link>
                      </div>
                    )}
                    <div className="flex-grow">
                      <CardTitle className="text-xl font-headline mb-1">
                        {bookDetail ? (
                           <Link href={`/books/${bookDetail.id}`} className="hover:underline text-primary">
                            {rec.title}
                           </Link>
                        ) : (
                          rec.title
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mb-2 font-medium">Reason:</p>
                      <p className="text-base">{rec.reason}</p>
                       {bookDetail && (
                         <Button asChild variant="outline" size="sm" className="mt-4">
                           <Link href={`/books/${bookDetail.id}`}>View Book</Link>
                         </Button>
                       )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
         {recommendations && recommendations.recommendedBooks.length === 0 && !isLoading && (
          <div className="mt-6 p-4 text-center text-muted-foreground">
            <p>No specific recommendations found based on your input. Try being more descriptive or check out our general catalog!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
