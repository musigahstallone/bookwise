
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

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (book: Book) => Promise<void>;
  removeFromCart: (bookId: string) => Promise<void>;
  clearCart: (silent?: boolean) => Promise<void>;
  getCartTotal: () => number;
  getItemCount: () => number;
  isLoading: boolean; // New loading state
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Initialize isLoading to true
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();

  // Effect to load/clear cart based on auth state
  useEffect(() => {
    const manageCartOnAuthChange = async () => {
      setIsLoading(true);
      if (currentUser) {
        // User is logged in, fetch cart from Firestore
        try {
          const firestoreCart = await getCartItemsFromDb(currentUser.uid);
          setCartItems(firestoreCart);
          localStorage.removeItem('bookwiseCart'); // Clear any local cart
        } catch (error) {
          console.error("Failed to load cart from Firestore:", error);
          toast({ title: "Cart Error", description: "Could not load your cart.", variant: "destructive" });
          setCartItems([]); // Reset to empty cart on error
        }
      } else if (!authIsLoading) { 
        // User is not logged in (and auth state is determined)
        const storedCartItems = localStorage.getItem('bookwiseCart');
        if (storedCartItems) {
          try {
            const parsedItems: CartItem[] = JSON.parse(storedCartItems);
            // Ensure quantity is 1, remove addedAt as it's not relevant for local
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

    if (!authIsLoading) { // Only run if auth state is resolved
        manageCartOnAuthChange();
    }
  }, [currentUser, authIsLoading, toast]);

  // Effect to save to localStorage for unauthenticated users
  useEffect(() => {
    if (!currentUser && !authIsLoading && !isLoading) { // Only save to localStorage if not logged in, auth determined, and initial cart load finished
      localStorage.setItem('bookwiseCart', JSON.stringify(cartItems));
    }
  }, [cartItems, currentUser, authIsLoading, isLoading]);

  const addToCart = useCallback(async (book: Book) => {
    if (currentUser) {
      const existingItem = cartItems.find((item) => item.id === book.id);
      if (existingItem) {
        toast({ title: `${book.title} is already in your cart.`, description: 'You can purchase one copy per PDF book.' });
        return;
      }
      try {
        setIsLoading(true);
        const newCartItem = await addBookToFirestoreCart(currentUser.uid, book);
        setCartItems((prevItems) => [...prevItems, newCartItem]);
        toast({ title: 'Added to Cart!', description: `${book.title} has been added to your cart.` });
      } catch (error) {
        toast({ title: "Cart Error", description: "Could not add item to your cart.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Unauthenticated: use localStorage
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === book.id);
        if (existingItem) {
          toast({ title: `${book.title} is already in your cart.`, description: 'You can purchase one copy per PDF book.' });
          return prevItems;
        }
        toast({ title: 'Added to Cart!', description: `${book.title} has been added to your cart.` });
        return [...prevItems, { ...book, quantity: 1 }];
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
      // Unauthenticated: use localStorage
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
      // Unauthenticated: use localStorage
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
