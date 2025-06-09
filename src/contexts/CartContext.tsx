
'use client';

import type { Book } from '@/data/books';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { 
  getCartItemsFromDb, 
  addBookToFirestoreCart, 
  removeBookFromFirestoreCart, 
  clearFirestoreCart,
  type CartItem
} from '@/lib/cart-service-firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (book: Book) => Promise<void>;
  removeFromCart: (bookId: string) => Promise<void>;
  clearCart: (silent?: boolean) => Promise<void>;
  getCartTotal: () => number;
  getItemCount: () => number;
  isLoading: boolean; 
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();

  useEffect(() => {
    const manageCartOnAuthChange = async () => {
      setIsLoading(true);
      if (currentUser) {
        try {
          const firestoreCart = await getCartItemsFromDb(currentUser.uid);
          setCartItems(firestoreCart);
          localStorage.removeItem('bookwiseCart'); 
        } catch (error) {
          console.error("Failed to load cart from Firestore:", error);
          toast({ title: "Cart Error", description: "Could not load your cart.", variant: "destructive" });
          setCartItems([]); 
        }
      } else if (!authIsLoading) { 
        const storedCartItems = localStorage.getItem('bookwiseCart');
        if (storedCartItems) {
          try {
            const parsedItems: CartItem[] = JSON.parse(storedCartItems);
            setCartItems(parsedItems.map(item => ({ ...item, quantity: 1, addedAt: undefined })));
          } catch (e) {
            setCartItems([]);
            localStorage.removeItem('bookwiseCart');
          }
        } else {
          setCartItems([]);
        }
      }
      setIsLoading(false);
    };

    if (!authIsLoading) { 
        manageCartOnAuthChange();
    }
  }, [currentUser, authIsLoading, toast]);

  useEffect(() => {
    if (!currentUser && !authIsLoading && !isLoading) { 
      localStorage.setItem('bookwiseCart', JSON.stringify(cartItems));
    }
  }, [cartItems, currentUser, authIsLoading, isLoading]);

  const addToCart = useCallback(async (book: Book) => {
    if (currentUser) {
      const existingItem = cartItems.find((item) => item.id === book.id);
      if (existingItem) {
        toast({ 
            title: `${book.title} is already in your cart.`, 
            description: 'You can purchase one copy per PDF book.',
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/cart">View Cart</Link>
              </Button>
            ),
        });
        return;
      }
      try {
        setIsLoading(true);
        const newCartItem = await addBookToFirestoreCart(currentUser.uid, book);
        setCartItems((prevItems) => {
          // Remove any existing item with the same ID before adding the new one.
          // This handles potential race conditions or inconsistencies.
          const itemsWithoutCurrent = prevItems.filter(item => item.id !== newCartItem.id);
          return [...itemsWithoutCurrent, newCartItem];
        });
        toast({ 
            title: 'Added to Cart!', 
            description: `${book.title} has been added.`,
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/cart">View Cart</Link>
              </Button>
            ),
        });
      } catch (error) {
        toast({ title: "Cart Error", description: "Could not add item to your cart.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === book.id);
        if (existingItem) {
          toast({ 
            title: `${book.title} is already in your cart.`, 
            description: 'You can purchase one copy per PDF book.',
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/cart">View Cart</Link>
              </Button>
            ),
          });
          return prevItems;
        }
        toast({ 
            title: 'Added to Cart!', 
            description: `${book.title} has been added.`,
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/cart">View Cart</Link>
              </Button>
            ),
        });
        // For localStorage, ensure we are adding a fresh item if it wasn't found
        const newItem = { ...book, quantity: 1 } as CartItem; // Cast to CartItem
        const itemsWithoutCurrent = prevItems.filter(item => item.id !== newItem.id);
        return [...itemsWithoutCurrent, newItem];
      });
    }
  }, [currentUser, cartItems, toast]);

  const removeFromCart = useCallback(async (bookId: string) => {
    const itemToRemove = cartItems.find(item => item.id === bookId);
    if (!itemToRemove) return;

    if (currentUser) {
      try {
        setIsLoading(true);
        await removeBookFromFirestoreCart(currentUser.uid, bookId);
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== bookId));
        toast({ title: 'Removed from Cart', description: `${itemToRemove.title} has been removed.`, variant: 'destructive' });
      } catch (error) {
        toast({ title: "Cart Error", description: "Could not remove item from your cart.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems((prevItems) => prevItems.filter((item) => item.id !== bookId));
      toast({ title: 'Removed from Cart', description: `${itemToRemove.title} has been removed.`, variant: 'destructive' });
    }
  }, [currentUser, cartItems, toast]);

  const clearCart = useCallback(async (silent: boolean = false) => {
    if (currentUser) {
      try {
        setIsLoading(true);
        await clearFirestoreCart(currentUser.uid);
        setCartItems([]);
        if (!silent) toast({ title: 'Cart Cleared', description: 'All items removed from your cart.' });
      } catch (error) {
        if (!silent) toast({ title: "Cart Error", description: "Could not clear your cart.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems([]);
      if (!silent) toast({ title: 'Cart Cleared', description: 'All items removed from your cart.' });
    }
  }, [currentUser, toast]);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  }, [cartItems]);

  const getItemCount = useCallback(() => {
    return cartItems.length;
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        getCartTotal,
        getItemCount,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

