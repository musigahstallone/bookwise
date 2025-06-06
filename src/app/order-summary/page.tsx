
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Download, ShoppingBag, Loader2, AlertTriangle } from 'lucide-react';
import type { Book } from '@/data/books';

// This interface should match CartItem from CartContext if it has specific fields
interface PurchasedItem extends Book {
  // quantity is implicitly 1 for PDFs as per CartContext logic
}

export default function OrderSummaryPage() {
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const itemsJson = sessionStorage.getItem('lastPurchasedItems');
    if (itemsJson) {
      try {
        const items = JSON.parse(itemsJson) as PurchasedItem[];
        if (Array.isArray(items)) {
          setPurchasedItems(items);
        } else {
          setError("Invalid order data found.");
        }
        // Clear the item from sessionStorage to prevent re-display on refresh or back navigation
        sessionStorage.removeItem('lastPurchasedItems');
      } catch (e) {
        console.error("Failed to parse purchased items from session storage:", e);
        setError("Could not load your order details. The data might be corrupted.");
        sessionStorage.removeItem('lastPurchasedItems'); // Also remove if parsing fails
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your order summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <AlertTriangle className="h-24 w-24 text-destructive mb-6" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-4">Order Error</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">{error}</p>
        <Button asChild size="lg">
          <Link href="/shop">Go to Shop</Link>
        </Button>
      </div>
    );
  }
  
  if (purchasedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <ShoppingBag className="h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-headline font-bold text-primary mb-4">No Order Details Found</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          It looks like your previous order session has ended or no purchase was completed.
        </p>
        <Button asChild size="lg">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  const totalAmount = purchasedItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary">Thank You For Your Purchase!</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your order has been successfully processed. You can download your books below.
        </p>
      </div>

      <Card className="shadow-xl mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Order Summary</CardTitle>
          <CardDescription>You purchased {purchasedItems.length} item(s) for a total of ${totalAmount.toFixed(2)}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {purchasedItems.map((book) => (
            <div key={book.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-card/50">
              <div className="w-24 h-24 sm:w-20 sm:h-20 relative flex-shrink-0 rounded overflow-hidden aspect-square">
                <Image
                  src={book.coverImageUrl}
                  alt={book.title}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={book.dataAiHint || 'purchased book'}
                />
              </div>
              <div className="flex-grow text-center sm:text-left">
                <h3 className="text-lg font-headline font-semibold text-primary">{book.title}</h3>
                <p className="text-sm text-muted-foreground">By {book.author}</p>
                <p className="text-sm text-foreground font-medium">${book.price.toFixed(2)}</p>
              </div>
              <Button asChild size="sm" className="w-full sm:w-auto mt-2 sm:mt-0">
                <a href={book.pdfUrl} download={`${book.title.replace(/\s+/g, '_')}.pdf`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button asChild size="lg" variant="outline">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}

