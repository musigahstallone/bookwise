
'use client';

import type { Book } from '@/data/books';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CartItem extends Book {
  quantity: 1; // Quantity is always 1 for PDF downloads
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (book: Book) => void;
  removeFromCart: (bookId: string) => void;
  clearCart: (silent?: boolean) => void; // Added optional silent parameter
  getCartTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedCartItems = localStorage.getItem('bookwiseCart');
    if (storedCartItems) {
      const parsedItems: CartItem[] = JSON.parse(storedCartItems);
      setCartItems(parsedItems.map(item => ({ ...item, quantity: 1 })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bookwiseCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (book: Book) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === book.id);
      if (existingItem) {
        toast({
          title: `${book.title} is already in your cart.`,
          description: 'You can purchase one copy per PDF book.',
        });
        return prevItems;
      } else {
        toast({
          title: 'Added to Cart!',
          description: `${book.title} has been added to your cart.`,
        });
        return [...prevItems, { ...book, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (bookId: string) => {
    setCartItems((prevItems) => {
      const itemToRemove = prevItems.find(item => item.id === bookId);
      if (itemToRemove) {
        toast({
          title: 'Removed from Cart',
          description: `${itemToRemove.title} has been removed.`,
          variant: 'destructive'
        });
      }
      return prevItems.filter((item) => item.id !== bookId);
    });
  };

  const clearCart = (silent: boolean = false) => {
    setCartItems([]);
    if (!silent) {
      toast({
        title: 'Cart Cleared',
        description: 'All items have been removed from your cart.',
      });
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  const getItemCount = () => {
    return cartItems.length;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        getCartTotal,
        getItemCount,
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
