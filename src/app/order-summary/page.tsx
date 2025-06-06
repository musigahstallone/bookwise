
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Download, ShoppingBag, Loader2, AlertTriangle } from 'lucide-react';
// Removed direct Book type import, will use a simpler PurchasedItem interface
import { useCart } from '@/contexts/CartContext';
import { getRegionByCode, defaultRegion, type Region } from '@/data/regionData';
import { useAuth } from '@/contexts/AuthContext';
import { handleRecordDownload } from '@/lib/actions/trackingActions';
import { useToast } from '@/hooks/use-toast';

interface PurchasedItem {
  id: string;
  title: string;
  author: string;
  price: number;
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
}

export default function OrderSummaryPage() {
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { clearCart } = useCart(); // Used for silent cart clear on mount if needed
  const [regionForFormatting, setRegionForFormatting] = useState<Region>(defaultRegion);
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const itemsJson = sessionStorage.getItem('lastPurchasedItems');
    const regionCodeJson = sessionStorage.getItem('lastPurchasedRegionCode');
    
    if (regionCodeJson) {
        const region = getRegionByCode(regionCodeJson);
        if (region) {
            setRegionForFormatting(region);
        }
    }

    if (itemsJson) {
      try {
        const items = JSON.parse(itemsJson) as PurchasedItem[];
        if (Array.isArray(items) && items.length > 0) {
          setPurchasedItems(items);
          // Cart should have been cleared by CartPage after successful checkout.
          // If a user lands here directly without going through cart checkout,
          // this ensures any lingering local cart is also cleared to avoid confusion
          // if they were using local storage before Firestore cart.
          clearCart(true); 
        } else if (items.length === 0) {
          setError("No items were in your cart at checkout.");
        } else {
          setError("Invalid order data found.");
        }
        // Clear session storage after use
        sessionStorage.removeItem('lastPurchasedItems');
        sessionStorage.removeItem('lastPurchasedRegionCode');
      } catch (e) {
        console.error("Failed to parse purchased items from session storage:", e);
        setError("Could not load your order details. The data might be corrupted.");
        sessionStorage.removeItem('lastPurchasedItems');
        sessionStorage.removeItem('lastPurchasedRegionCode');
      }
    }
    setIsLoading(false);
  }, [clearCart]); // clearCart is stable

  const formatPriceInOrderCurrency = (usdPrice: number): string => {
    const convertedPrice = usdPrice * regionForFormatting.conversionRateToUSD;
    let displayPrice;
    if (regionForFormatting.currencyCode === 'KES') {
        if (Math.abs(convertedPrice - Math.round(convertedPrice)) < 0.005) {
             displayPrice = Math.round(convertedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    } else {
         displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${regionForFormatting.currencySymbol}${displayPrice}`;
  };

  const onDownloadClick = async (bookId: string, bookTitle: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to record a download.",
        variant: "destructive",
      });
      return;
    }
    try {
        const result = await handleRecordDownload(bookId, currentUser.uid);
        if (result.success) {
          toast({
            title: "Download Recorded",
            description: `Your download of "${bookTitle}" has been logged.`,
          });
        } else {
          toast({
            title: "Download Logging Failed",
            description: result.message || `Could not log download for "${bookTitle}".`,
            variant: "destructive",
          });
        }
    } catch (e: any) {
        toast({
            title: "Download Logging Error",
            description: e.message || "An unexpected error occurred while logging the download.",
            variant: "destructive",
        });
    }
  };

  if (isLoading || authIsLoading) {
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
          It looks like your previous order session has ended, no purchase was completed, or your cart was empty.
        </p>
        <Button asChild size="lg">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  const totalAmountUSD = purchasedItems.reduce((sum, item) => sum + item.price, 0);

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
          <CardDescription>You purchased {purchasedItems.length} item(s) for a total of {formatPriceInOrderCurrency(totalAmountUSD)}.</CardDescription>
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
                <p className="text-sm text-foreground font-medium">{formatPriceInOrderCurrency(book.price)}</p>
              </div>
              <Button 
                asChild 
                size="sm" 
                className="w-full sm:w-auto mt-2 sm:mt-0"
                onClick={async (e) => {
                    e.preventDefault(); // Prevent default link navigation initially
                    await onDownloadClick(book.id, book.title);
                    // After attempting to record, navigate to the PDF URL
                    // This ensures the record attempt happens before download starts.
                    // Note: If PDF opens in same tab, toast might be missed.
                    // A more robust way might be to open PDF in new tab or delay navigation.
                    window.location.href = book.pdfUrl; 
                }}
              >
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
