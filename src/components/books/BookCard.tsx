
'use client';

import type { Book } from '@/data/books';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react'; // Removed ShoppingCart
// import { useCart } from '@/contexts/CartContext'; // No longer adding to cart from card
import { useRegion } from '@/contexts/RegionContext'; 
// import { useAuth } from '@/contexts/AuthContext'; // Not needed if cart button is removed

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const currentYear = new Date().getFullYear();
  const isNew = book.publishedYear >= currentYear - 1;
  // const { addToCart } = useCart(); // Removed
  const { formatPrice } = useRegion();
  // const { currentUser } = useAuth(); // Removed

  // const handleAddToCart = (e: React.MouseEvent) => { // Removed
  //   e.preventDefault(); 
  //   e.stopPropagation();
  //   addToCart(book);
  // };

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300 group">
      <CardHeader className="p-0 relative">
        <Link href={`/books/${book.id}`} className="block aspect-square w-full relative">
          <Image
            src={book.coverImageUrl}
            alt={book.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={book.dataAiHint || 'book cover'}
          />
          {isNew && (
            <Badge variant="default" className="absolute top-2 left-2 bg-primary text-primary-foreground shadow-md z-10">
              NEW!
            </Badge>
          )}
          {/* Cart button removed from here as per request */}
          {/* {currentUser && (
            <Button
              variant="default"
              size="icon"
              onClick={handleAddToCart}
              className="absolute top-2 right-2 z-10 h-9 w-9 p-2 rounded-full shadow-md opacity-80 group-hover:opacity-100 transition-opacity"
              aria-label={`Add ${book.title} to cart`}
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
          )} */}
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-headline mb-1 line-clamp-2">
          <Link href={`/books/${book.id}`} className="hover:underline">
            {book.title}
          </Link>
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-2">
          By{' '}
          <Link href={`/authors/${encodeURIComponent(book.author)}`} className="hover:underline text-primary/90">
            {book.author}
          </Link>
        </CardDescription>
        <p className="text-sm line-clamp-3 mb-3">{book.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
        <p className="text-lg font-bold text-primary order-1 sm:order-none">{formatPrice(book.price)}</p> 
        <div className="flex space-x-2 order-2 sm:order-none w-full sm:w-auto justify-center sm:justify-end">
          <Button asChild variant="outline" size="sm" className="flex-grow sm:flex-grow-0">
            <Link href={`/books/${book.id}`}>
              View Details <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BookCard;
