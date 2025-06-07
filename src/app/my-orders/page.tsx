
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { History, Download, ShoppingBag, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrdersByUserIdFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase';
import { handleRecordDownload } from '@/lib/actions/trackingActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getRegionByCode, defaultRegion } from '@/data/regionData'; // Import directly

export default function MyOrdersPage() {
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithUserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      getOrdersByUserIdFromDb(currentUser.uid)
        .then(fetchedOrders => {
          setOrders(fetchedOrders);
          setError(null);
        })
        .catch(err => {
          console.error("Error fetching user orders:", err);
          setError("Could not load your orders. Please try again later.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading) {
      // If auth is done loading and there's no user, stop loading
      setIsLoading(false);
    }
  }, [currentUser, authIsLoading]);

  const onDownloadClick = async (bookId: string, bookTitle: string, pdfUrl: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const result = await handleRecordDownload(bookId, currentUser.uid);
      if (result.success) {
        toast({ title: "Download Recorded", description: `Download of "${bookTitle}" logged.` });
      } else {
        toast({ title: "Logging Failed", description: result.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Logging Error", description: e.message, variant: "destructive" });
    }
    window.location.href = pdfUrl;
  };

  const formatOrderPrice = (totalAmountUSD: number, regionCode: string, currencySymbolOrder: string) => {
    const orderRegion = getRegionByCode(regionCode) || defaultRegion; // Use imported functions
    const convertedPrice = totalAmountUSD * orderRegion.conversionRateToUSD;
     let displayPrice;
    if (orderRegion.currencyCode === 'KES') {
        if (Math.abs(convertedPrice - Math.round(convertedPrice)) < 0.005) {
             displayPrice = Math.round(convertedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    } else {
         displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${currencySymbolOrder}${displayPrice}`;
  };

  if (isLoading || authIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your orders...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <History className="h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-headline font-bold text-primary mb-4">View Your Orders</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          Please <Link href={`/login?redirectUrl=/my-orders`} className="text-primary hover:underline font-semibold">login</Link> to see your order history.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <AlertTriangle className="h-24 w-24 text-destructive mb-6" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-4">Error Loading Orders</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <ShoppingBag className="h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-headline font-bold text-primary mb-4">No Orders Yet</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          You haven't placed any orders yet.
        </p>
        <Button asChild size="lg">
          <Link href="/shop">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <History className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary">Your Order History</h1>
      </div>

      <div className="space-y-8">
        {orders.map((order) => (
          <Card key={order.id} className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div>
                    <CardTitle className="text-xl font-headline">Order ID: <span className="font-normal text-base text-muted-foreground">{order.id.substring(0,8)}...</span></CardTitle>
                    <CardDescription>
                    Placed on: {format(order.orderDate, "PPpp")}
                    </CardDescription>
                </div>
                <p className="text-lg font-semibold text-primary mt-2 sm:mt-0">
                    Total: {formatOrderPrice(order.totalAmountUSD, order.regionCode, order.currencyCode.toUpperCase())} 
                    <span className="text-sm text-muted-foreground"> ({order.itemCount} item{order.itemCount !== 1 ? 's' : ''})</span>
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold text-md text-foreground">Items:</h4>
              {order.items.map((item, index) => (
                <div key={item.bookId || index} className="flex flex-col sm:flex-row items-center gap-4 p-3 border rounded-md bg-background/50">
                  <div className="w-20 h-20 sm:w-16 sm:h-16 relative flex-shrink-0 rounded overflow-hidden aspect-square">
                    <Image
                      src={item.coverImageUrl || 'https://placehold.co/100x100.png'}
                      alt={item.title}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={item.dataAiHint || 'ordered book cover'}
                    />
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <h3 className="text-md font-semibold text-primary">{item.title}</h3>
                    <p className="text-sm text-foreground">Price Paid: {formatOrderPrice(item.price, order.regionCode, order.currencyCode.toUpperCase())}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto mt-2 sm:mt-0"
                    onClick={() => onDownloadClick(item.bookId, item.title, item.pdfUrl)}
                    disabled={!item.pdfUrl || item.pdfUrl.includes('placeholder-book.pdf')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

