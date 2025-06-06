
'use client';

import type { Book } from '@/data/books';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext'; 
import { useToast } from '@/hooks/use-toast'; 
import { useRouter } from 'next/navigation'; 
import Link from 'next/link'; // For the link within the toast

interface AddToCartButtonProps {
  book: Book;
}

export default function AddToCartButton({ book }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const { currentUser } = useAuth(); 
  const { toast } = useToast(); 
  const router = useRouter(); 

  const handleAddToCart = () => {
    if (!currentUser) {
      toast({
        title: 'Login Required',
        description: (
            <div className="flex flex-col gap-2">
                <p>Please log in to add items to your cart.</p>
                <Button variant="default" size="sm" asChild onClick={() => router.push('/login')}>
                    <Link href="/login">Login</Link>
                </Button>
            </div>
        ),
        duration: 5000, // Keep toast longer
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
