// src/app/orders/[orderId]/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, Download, ShoppingBag, ArrowLeft, Info, RefreshCw, CreditCard, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrderByIdFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase';
import { handleRecordDownload } from '@/lib/actions/trackingActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { formatCurrency } from '@/lib/formatters'; // Import the new helper

function SpecificOrderPageContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const [order, setOrder] = useState<OrderWithUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrderDetails = async () => {
    if (!currentUser || !orderId) {
      if (!currentUser && !authIsLoading) setError("Please log in to view your order.");
      else if (!orderId) setError("Order ID is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedOrder = await getOrderByIdFromDb(orderId, currentUser.uid);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      } else {
        setError("Order not found or you do not have permission to view it.");
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError("Failed to load order details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authIsLoading) { // Only fetch once auth state is known
        fetchOrderDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, currentUser, authIsLoading]); // Rerun if orderId or user changes

  const onDownloadClick = async (bookId: string, bookTitle: string, pdfUrl: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Log in to download.", variant: "destructive" });
      return;
    }
    if (!pdfUrl || pdfUrl.includes('placeholder-book.pdf') || pdfUrl.trim() === '') {
        toast({ title: "Download Not Available", description: `PDF for "${bookTitle}" is not available.`, variant: "destructive" });
        return;
    }
    try {
      toast({ title: "Preparing Download...", description: `Checking permissions for "${bookTitle}".`});
      const result = await handleRecordDownload(bookId, currentUser.uid);
      if (result.success) {
        toast({ title: "Download Approved", description: `Starting download for "${bookTitle}".` });
        // Create a temporary link and click it to trigger download
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', `${bookTitle.replace(/[^a-zA-Z0-9_]/g, '_')}.pdf`); // Sanitize filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else {
        toast({ title: "Download Denied", description: result.message, variant: "destructive", duration: 7000 });
      }
    } catch (e: any) {
      toast({ title: "Download Error", description: e.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };
  
  const getStatusBadgeColorClasses = (status?: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'failed': case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };


  if (isLoading || authIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Order Error" message={error} retryAction={fetchOrderDetails} showHomeButton={true} />;
  }

  if (!order) {
    return <ErrorDisplay title="Order Not Found" message="The requested order could not be found or is inaccessible." showHomeButton={true} />;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Button variant="outline" asChild className="mb-6 group">
        <Link href="/my-orders">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to My Orders
        </Link>
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-muted/30 p-4 sm:p-6 rounded-t-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-2xl font-headline text-primary">Order Details</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">ID: {order.id}</CardDescription>
            </div>
            <Badge className={`capitalize text-sm px-3 py-1.5 ${getStatusBadgeColorClasses(order.status)}`}>{order.status}</Badge>
          </div>
          <Separator className="my-3"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><strong className="font-medium text-foreground">Date Placed:</strong> {format(order.orderDate, "MMM d, yyyy 'at' h:mm a")}</p>
            <p><strong className="font-medium text-foreground">Last Updated:</strong> {format(order.lastUpdatedAt, "MMM d, yyyy 'at' h:mm a")}</p>
            <p><strong className="font-medium text-foreground">Payment Method:</strong> {order.paymentMethod || 'N/A'}</p>
            <p><strong className="font-medium text-foreground">Total:</strong> {formatCurrency(order.actualAmountPaid, order.currencyCode, order.regionCode)}</p>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold font-headline text-foreground mb-3">Items in this Order ({order.itemCount}):</h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={item.bookId || index} className="p-3 border rounded-md bg-card hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-24 h-32 sm:w-20 sm:h-28 relative flex-shrink-0 rounded overflow-hidden shadow">
                    <Image src={item.coverImageUrl} alt={item.title} layout="fill" objectFit="cover" data-ai-hint={item.dataAiHint || 'book cover small'}/>
                  </div>
                  <div className="flex-grow">
                    <Link href={`/books/${item.bookId}`} className="hover:underline">
                      <h4 className="text-md font-semibold font-headline text-primary">{item.title}</h4>
                    </Link>
                    <p className="text-sm text-muted-foreground">Price Paid: {formatCurrency(item.price, order.currencyCode, order.regionCode)}</p>
                  </div>
                  {order.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full sm:w-auto mt-2 sm:mt-0 self-start sm:self-center"
                      onClick={() => onDownloadClick(item.bookId, item.title, item.pdfUrl)}
                      disabled={!item.pdfUrl || item.pdfUrl.includes('placeholder-book.pdf') || item.pdfUrl.trim() === ''}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                </div>
                {(!item.pdfUrl || item.pdfUrl.includes('placeholder-book.pdf') || item.pdfUrl.trim() === '') && order.status === 'completed' && (
                    <p className="text-xs text-destructive mt-1 flex items-center"><Info className="h-3 w-3 mr-1"/> PDF currently unavailable for this item.</p>
                )}
              </div>
            ))}
          </div>

          {order.status === 'failed' && (
            <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive rounded-md">
              <p className="font-semibold text-destructive-foreground flex items-center"><AlertTriangle className="h-5 w-5 mr-2"/>Payment Failed</p>
              <p className="text-sm text-destructive-foreground/90 mt-1">
                There was an issue processing the payment for this order. You can try paying again.
              </p>
              <Button asChild className="mt-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <Link href={`/checkout/payment?order_id=${order.id}&retry_payment=true`}>
                  <CreditCard className="mr-2 h-4 w-4"/> Retry Payment
                </Link>
              </Button>
            </div>
          )}
          {order.status === 'pending' && (
             <div className="mt-6 p-4 bg-yellow-100/70 border-l-4 border-yellow-400 rounded-md text-yellow-800">
              <p className="font-semibold flex items-center"><Loader2 className="h-5 w-5 mr-2 animate-spin"/>Payment Processing</p>
              <p className="text-sm mt-1">
                Your payment is currently being processed. The status will update once confirmed. Downloads will be available upon completion.
              </p>
               <Button variant="outline" size="sm" onClick={fetchOrderDetails} className="mt-3 border-yellow-500 text-yellow-700 hover:bg-yellow-200">
                  <RefreshCw className="mr-2 h-4 w-4"/> Refresh Status
                </Button>
            </div>
          )}
           {order.status === 'cancelled' && (
            <div className="mt-6 p-4 bg-orange-100/70 border-l-4 border-orange-400 rounded-md text-orange-800">
              <p className="font-semibold flex items-center"><FileText className="h-5 w-5 mr-2"/>Order Cancelled</p>
              <p className="text-sm mt-1">
                This order was cancelled. If you believe this is an error, please contact support.
              </p>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}


export default function SpecificOrderPage() {
  return (
    // Suspense can be used if you have parts of the page that load independently
    // For now, the main content loader handles the page loading state.
    // <Suspense fallback={<LoaderComponent />}>
      <SpecificOrderPageContent />
    // </Suspense>
  );
}
