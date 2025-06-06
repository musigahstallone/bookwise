
import type { Book } from '@/data/books';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { ArrowRight } from 'lucide-react';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const currentYear = new Date().getFullYear();
  const isNew = book.publishedYear >= currentYear - 1; // Consider books from last year and this year as new

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative"> {/* Added relative positioning */}
        <div className="aspect-[2/3] w-full relative">
          <Image
            src={book.coverImageUrl}
            alt={book.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={book.dataAiHint || 'book cover'}
          />
           {isNew && (
            <Badge variant="default" className="absolute top-2 right-2 bg-primary text-primary-foreground shadow-md">
              NEW!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-headline mb-1 line-clamp-2">{book.title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-2">By {book.author}</CardDescription>
        <p className="text-sm line-clamp-3 mb-3">{book.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <p className="text-lg font-bold text-primary">${book.price.toFixed(2)}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/books/${book.id}`}>
            View Details <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookCard;
