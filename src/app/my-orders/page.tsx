
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, ShoppingBag, Loader2, AlertTriangle, CalendarDays, Hash, Eye, Info } from 'lucide-react'; // Removed DollarSign, ExternalLink
import { useAuth } from '@/contexts/AuthContext';
import { getOrdersByUserIdFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase';
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
          setOrders(fetchedOrders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())); // Sort newest first
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


  const formatOrderPrice = (totalAmount?: number, orderCurrencyCode?: string, orderRegionCode?: string) => {
    // Add a defensive check for totalAmount
    if (typeof totalAmount !== 'number' || isNaN(totalAmount) || !orderCurrencyCode || !orderRegionCode) {
      return `${orderCurrencyCode || ''} N/A`; 
    }

    const resolvedRegion = getRegionByCode(orderRegionCode) || defaultRegion;
    // totalAmount here is actualAmountPaid in order's currency
    let displayPrice;
    if (orderCurrencyCode === 'KES') {
        if (Math.abs(totalAmount - Math.round(totalAmount)) < 0.005) {
             displayPrice = Math.round(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            displayPrice = totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    } else {
         displayPrice = totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${orderCurrencyCode} ${displayPrice}`;
  };

  const getStatusBadgeColorClasses = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
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

      <div className="space-y-6">
        {orders.map((order) => (
          <Card key={order.id} className="shadow-lg border border-border hover:shadow-xl transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                <div className="flex-grow space-y-1.5">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Hash className="h-4 w-4 mr-1.5 shrink-0" />
                    Order ID: <span className="font-medium text-foreground ml-1 truncate">{order.id}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 mr-1.5 shrink-0" />
                    Placed: <span className="font-medium text-foreground ml-1">{format(order.orderDate, "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                   <div className="flex items-center text-sm text-muted-foreground">
                    <ShoppingBag className="h-4 w-4 mr-1.5 shrink-0" />
                    Items: <span className="font-medium text-foreground ml-1">{order.itemCount}</span>
                  </div>
                </div>
                <div className="w-full sm:w-auto flex flex-col items-start sm:items-end space-y-2">
                  <Badge 
                    className={`capitalize text-xs sm:text-sm px-2.5 py-1 ${getStatusBadgeColorClasses(order.status)}`}
                  >
                    {order.status}
                  </Badge>
                  <div className="text-md sm:text-lg font-semibold text-primary flex items-center">
                    {/* Replaced DollarSign icon with direct display of currency */}
                    Total: {formatOrderPrice(order.actualAmountPaid, order.currencyCode, order.regionCode)}
                  </div>
                </div>
              </div>
              <Separator className="my-3 sm:my-4" />
              <div className="flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/orders/${order.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
       <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md text-sm">
        <p className="font-bold flex items-center"><Info className="mr-2 h-5 w-5" />Order Status Info:</p>
        <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li><strong>Pending:</strong> Payment is being processed (e.g., waiting for M-Pesa confirmation).</li>
            <li><strong>Completed:</strong> Payment successful. You can download your books from the order details page.</li>
            <li><strong>Failed:</strong> Payment was not successful. You can try again from the order details page.</li>
            <li><strong>Cancelled:</strong> The order was cancelled.</li>
        </ul>
      </div>
    </div>
  );
}

