
'use client';

import type { Book } from '@/data/books';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext'; // Added
import { useToast } from '@/hooks/use-toast'; // Added
import { useRouter } from 'next/navigation'; // Added

interface AddToCartButtonProps {
  book: Book;
}

export default function AddToCartButton({ book }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const { currentUser } = useAuth(); // Added
  const { toast } = useToast(); // Added
  const router = useRouter(); // Added

  const handleAddToCart = () => {
    if (!currentUser) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add items to your cart.',
        action: (
          <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
            Login
          </Button>
        ),
      });
      return;
    }
    addToCart(book);
  };

  return (
    <Button size="lg" onClick={handleAddToCart} className="bg-primary hover:bg-primary/90">
      <ShoppingCart className="mr-2 h-5 w-5" />
      Add to Cart
    </Button>
  );
}

