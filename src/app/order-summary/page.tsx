
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
// import Image from 'next/image'; // Removed as per request
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Download, ShoppingBag, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { getRegionByCode, defaultRegion, type Region } from '@/data/regionData';
import { useAuth } from '@/contexts/AuthContext';
import { handleRecordDownload } from '@/lib/actions/trackingActions';
import { useToast } from '@/hooks/use-toast';

interface PurchasedItem {
  id: string; // bookId
  title: string;
  price: number;
  coverImageUrl: string; // Kept for data model consistency, but not displayed
  pdfUrl: string;
  dataAiHint?: string;
}

export default function OrderSummaryPage() {
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          const validItems = items.filter(item => typeof item.id === 'string' && item.id && typeof item.title === 'string');
          if (validItems.length !== items.length) {
            console.warn("Some purchased items had missing IDs or titles after parsing from session storage.");
          }
          setPurchasedItems(validItems);
          if (validItems.length === 0 && items.length > 0) {
             setError("Order data seems corrupted. Please check your 'My Orders' page for details.");
          }
        } else if (items.length === 0) {
          setError("No items were found for this order summary.");
        } else {
          setError("Invalid order data found in session.");
        }
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
  }, []);


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

  const onDownloadClick = async (bookId: string, bookTitle: string, pdfUrl: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to record a download.",
        variant: "destructive",
      });
      return;
    }
    if (!pdfUrl || pdfUrl.includes('placeholder-book.pdf') || pdfUrl.trim() === '') {
        toast({
            title: "Download Not Available",
            description: `The PDF for "${bookTitle}" is currently not available. Please contact support.`,
            variant: "destructive",
        });
        return;
    }
    try {
        const result = await handleRecordDownload(bookId, currentUser.uid);
        if (result.success) {
          toast({
            title: "Download Logged",
            description: `Preparing download for "${bookTitle}".`,
          });
          window.location.href = pdfUrl;
        } else {
          toast({
            title: "Download Denied",
            description: result.message, // Message from server action (e.g., rate limit)
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
          It looks like your previous order session has ended or no purchase was completed.
        </p>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-center sm:space-x-3">
            <Button asChild size="lg">
            <Link href="/shop">Continue Shopping</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="mt-4 sm:mt-0">
            <Link href="/my-orders">View Your Past Orders</Link>
            </Button>
        </div>
      </div>
    );
  }

  const totalAmountUSD = purchasedItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Card className="shadow-xl border-green-500 border-2">
        <CardHeader className="text-center bg-green-50 py-8">
          <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-3xl sm:text-4xl font-headline text-green-700">Thank You For Your Purchase!</CardTitle>
          <CardDescription className="text-md sm:text-lg text-muted-foreground mt-2">
            Your order has been successfully processed. You can download your books below or find them anytime in <Link href="/my-orders" className="text-primary hover:underline font-semibold">My Orders</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
            <div className="text-center mb-6">
                <p className="text-lg font-medium text-foreground">
                    Total Amount: {formatPriceInOrderCurrency(totalAmountUSD)} ({purchasedItems.length} item{purchasedItems.length === 1 ? '' : 's'})
                </p>
            </div>
          {purchasedItems.map((item, index) => (
            <div key={item.id || index} className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border rounded-lg bg-card/50 shadow-sm">
              <div className="flex-grow text-center sm:text-left">
                <h3 className="text-md font-headline font-semibold text-primary">{item.title || 'Unknown Title'}</h3>
                <p className="text-sm text-muted-foreground font-medium">{formatPriceInOrderCurrency(item.price)}</p>
              </div>
              <Button
                size="sm"
                className="w-full sm:w-auto mt-2 sm:mt-0 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => onDownloadClick(item.id, item.title, item.pdfUrl)}
                disabled={!item.pdfUrl || item.pdfUrl.includes('placeholder-book.pdf') || item.pdfUrl.trim() === ''}
              >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-center mt-8 space-y-3 sm:space-y-0 sm:flex sm:justify-center sm:gap-4">
        <Button asChild size="lg">
          <Link href="/my-orders" className="flex items-center">
            Go to My Orders <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
