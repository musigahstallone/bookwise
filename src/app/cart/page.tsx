
'use client';

import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function CartPage() {
  const { cartItems, removeFromCart, clearCart, getCartTotal, getItemCount } = useCart();
  const router = useRouter();
  const { toast } = useToast();

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Your cart is empty!",
        description: "Please add some books to your cart before proceeding to checkout.",
        variant: "destructive",
      });
      return;
    }
    // In a real app, this would redirect to a checkout page.
    // For now, we simulate a purchase and clear the cart, then redirect to a generic success page.
    // We'll use the first book's ID for the purchase success page for simplicity in this mock.
    const firstBookId = cartItems[0].id;
    
    toast({
      title: "Mock Checkout Successful!",
      description: "Thank you for your 'purchase'. Your cart has been cleared.",
    });
    clearCart();
    router.push(`/purchase-success/${firstBookId}`); // Navigate to a success page
  };

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-headline font-bold text-primary mb-4">Your Cart is Empty</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Looks like you haven&apos;t added any books to your cart yet.
        </p>
        <Button asChild size="lg">
          <Link href="/shop">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-headline font-bold text-primary">Your Shopping Cart</h1>
        {cartItems.length > 0 && (
          <Button variant="outline" onClick={clearCart} className="text-destructive hover:text-destructive border-destructive/50 hover:bg-destructive/10">
            <XCircle className="mr-2 h-4 w-4" /> Clear Cart
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {cartItems.map((item) => (
            <Card key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center p-4 shadow-md overflow-hidden">
              <div className="w-24 h-24 sm:w-20 sm:h-20 relative flex-shrink-0 rounded overflow-hidden mr-0 sm:mr-6 mb-4 sm:mb-0 aspect-square">
                <Image src={item.coverImageUrl} alt={item.title} layout="fill" objectFit="cover" data-ai-hint={item.dataAiHint || 'book cart item'} />
              </div>
              <div className="flex-grow">
                <Link href={`/books/${item.id}`} className="hover:underline">
                  <h2 className="text-lg font-headline font-semibold text-primary">{item.title}</h2>
                </Link>
                <p className="text-sm text-muted-foreground">By {item.author}</p>
                <p className="text-md font-semibold text-foreground mt-1">${item.price.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Quantity: 1 (PDF Download)</p>
              </div>
              <div className="flex items-center space-x-3 mt-4 sm:mt-0 sm:ml-auto flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Remove item</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-lg sticky top-24">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-base">
                <span>Subtotal ({getItemCount()} items)</span>
                <span className="font-semibold">${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span>Shipping</span>
                <span className="font-semibold">Free (PDF Download)</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold text-primary">
                <span>Total</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
              <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-4" onClick={handleCheckout}>
                Proceed to Mock Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
