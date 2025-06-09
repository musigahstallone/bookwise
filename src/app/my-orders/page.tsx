
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Download, ShoppingBag, Loader2, AlertTriangle, CalendarDays, Hash, DollarSign, Package, Info } from 'lucide-react';
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
      setIsLoading(false); // Not logged in, not loading orders.
    }
  }, [currentUser, authIsLoading]);

  const onDownloadClick = async (bookId: string, bookTitle: string, pdfUrl: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to download.", variant: "destructive" });
      return;
    }
    if (!pdfUrl || pdfUrl.includes('placeholder-book.pdf') || pdfUrl.trim() === '') {
        toast({
            title: "Download Not Available",
            description: `The PDF for "${bookTitle}" is currently not available. Please contact support if you believe this is an error.`,
            variant: "destructive",
            duration: 7000,
        });
        return;
    }
    try {
      toast({ title: "Preparing Download...", description: `Checking download permissions for "${bookTitle}".`});
      const result = await handleRecordDownload(bookId, currentUser.uid);
      if (result.success) {
        toast({ title: "Download Approved", description: `Starting download for "${bookTitle}".` });
        window.location.href = pdfUrl;
      } else {
        toast({ title: "Download Denied", description: result.message, variant: "destructive", duration: 7000 });
      }
    } catch (e: any) {
      toast({ title: "Download Error", description: e.message || "An unexpected error occurred.", variant: "destructive", duration: 7000 });
    }
  };

  const formatOrderPrice = (totalAmountUSD: number, orderRegionCode: string, orderCurrencyCode: string) => {
    const resolvedRegion = getRegionByCode(orderRegionCode) || defaultRegion;
    const convertedPrice = totalAmountUSD * resolvedRegion.conversionRateToUSD;
     let displayPrice;
    if (resolvedRegion.currencyCode === 'KES') {
        if (Math.abs(convertedPrice - Math.round(convertedPrice)) < 0.005) {
             displayPrice = Math.round(convertedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    } else {
         displayPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${resolvedRegion.currencyCode} ${displayPrice}`;
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
        case 'completed': return 'default';
        case 'pending': return 'secondary';
        case 'failed': return 'destructive';
        default: return 'outline';
    }
  };
   const getStatusBadgeColorClasses = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
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
          You haven't placed any orders yet. If you recently made a payment, it might be processing.
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
                    Total: {formatOrderPrice(order.totalAmountUSD, order.regionCode, order.currencyCode)}
                  </div>
                </div>
              </div>
               <Badge variant={getStatusBadgeVariant(order.status)} className={`mt-2 w-fit capitalize ${getStatusBadgeColorClasses(order.status)}`}>
                  {order.status}
               </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-md text-foreground -mb-1">Items Purchased:</h4>
              {order.items.map((item, index) => (
                <div key={item.bookId || index} className="pt-3">
                  {index > 0 && <Separator className="mb-3" />}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-grow">
                      <Link href={`/books/${item.bookId}`} className="hover:underline">
                        <h3 className="text-md font-headline font-semibold text-primary">{item.title}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Price Paid: {formatOrderPrice(item.price, order.regionCode, order.currencyCode)}
                      </p>
                    </div>
                    {order.status === 'completed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={() => onDownloadClick(item.bookId, item.title, item.pdfUrl)}
                        disabled={!item.pdfUrl || pdfUrl.includes('placeholder-book.pdf') || item.pdfUrl.trim() === ''}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    ) : (
                      <div className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-right mt-2 sm:mt-0">
                        <Info className="inline h-4 w-4 mr-1" />
                        {order.status === 'pending' ? 'Download available upon payment completion.' : 'Download not available.'}
                      </div>
                    )}
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
