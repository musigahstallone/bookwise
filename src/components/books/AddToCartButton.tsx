
'use client';

import type { Book } from '@/data/books';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface AddToCartButtonProps {
  book: Book;
}

export default function AddToCartButton({ book }: AddToCartButtonProps) {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(book);
  };

  return (
    <Button size="lg" onClick={handleAddToCart} className="bg-primary hover:bg-primary/90">
      <ShoppingCart className="mr-2 h-5 w-5" />
      Add to Cart
    </Button>
  );
}
