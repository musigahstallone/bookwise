
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { History, Download, ShoppingBag, Loader2, AlertTriangle, CalendarDays, Hash, DollarSign, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrdersByUserIdFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase';
import { handleRecordDownload } from '@/lib/actions/trackingActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getRegionByCode, defaultRegion } from '@/data/regionData';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
      setIsLoading(false);
    }
  }, [currentUser, authIsLoading]);

  const onDownloadClick = async (bookId: string, bookTitle: string, pdfUrl: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!pdfUrl || pdfUrl.includes('placeholder-book.pdf') || pdfUrl.trim() === '') {
        toast({
            title: "Download Not Available",
            description: `The PDF for "${bookTitle}" is currently not available.`,
            variant: "destructive",
        });
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
    const orderRegion = getRegionByCode(regionCode) || defaultRegion;
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
          <Card key={order.id} className="shadow-lg border border-border">
            <CardHeader className="bg-muted/30 p-4 rounded-t-lg">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Hash className="h-4 w-4 mr-1.5" />
                    Order ID: <span className="font-medium text-foreground ml-1">{order.id.substring(0,8)}...</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 mr-1.5" />
                    Placed: <span className="font-medium text-foreground ml-1">{format(order.orderDate, "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>
                <div className="space-y-1 text-left sm:text-right">
                   <div className="flex items-center text-sm text-muted-foreground sm:justify-end">
                        <Package className="h-4 w-4 mr-1.5" />
                        Items: <span className="font-medium text-foreground ml-1">{order.itemCount}</span>
                    </div>
                  <div className="flex items-center text-lg font-semibold text-primary sm:justify-end">
                    <DollarSign className="h-5 w-5 mr-1" />
                    Total: {formatOrderPrice(order.totalAmountUSD, order.regionCode, order.currencyCode.toUpperCase())}
                  </div>
                </div>
              </div>
               <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="mt-2 w-fit capitalize bg-green-100 text-green-700 border-green-300">
                  {order.status}
               </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-semibold text-md text-foreground -mb-2">Items Purchased:</h4>
              {order.items.map((item, index) => (
                <div key={item.bookId || index} className="pt-4">
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-24 h-32 sm:w-20 sm:h-[115px] relative flex-shrink-0 rounded overflow-hidden shadow-sm border aspect-[2/3]">
                      <Image
                        src={item.coverImageUrl || 'https://placehold.co/80x120.png'}
                        alt={item.title}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint={item.dataAiHint || 'ordered book cover'}
                      />
                    </div>
                    <div className="flex-grow">
                      <Link href={`/books/${item.bookId}`} className="hover:underline">
                        <h3 className="text-lg font-headline font-semibold text-primary">{item.title}</h3>
                      </Link>
                      <p className="text-sm text-foreground mt-1">
                        Price Paid: {formatOrderPrice(item.price, order.regionCode, order.currencyCode.toUpperCase())}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto mt-3 sm:mt-0 self-center sm:self-end"
                      onClick={() => onDownloadClick(item.bookId, item.title, item.pdfUrl)}
                      disabled={!item.pdfUrl || item.pdfUrl.includes('placeholder-book.pdf')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

    