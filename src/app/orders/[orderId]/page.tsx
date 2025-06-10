
// src/app/orders/[orderId]/page.tsx
'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, Download, ShoppingBag, ArrowLeft, Info, RefreshCw, CreditCard, FileText, Timer, CheckSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrderByIdFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase'; // Keep for initial type, though onSnapshot is primary now
import { handleRecordDownload } from '@/lib/actions/trackingActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { formatCurrency } from '@/lib/formatters';
import { getRegionByCode, defaultRegion } from '@/data/regionData';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'; // Added onSnapshot and Timestamp
import { db } from '@/lib/firebase'; // Added db
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';


function SpecificOrderPageContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const [order, setOrder] = useState<OrderWithUserDetails | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false); // For manual refresh button
  const [error, setError] = useState<string | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string | null>>({});
  const { toast } = useToast();


  const processOrderData = useCallback(async (orderDataFromFirestore: any, id: string): Promise<OrderWithUserDetails> => {
    const user = await getUserDocumentFromDb(orderDataFromFirestore.userId);
    return {
      id: id,
      userId: orderDataFromFirestore.userId,
      userName: user?.name,
      userEmail: user?.email,
      items: orderDataFromFirestore.items,
      totalAmountUSD: orderDataFromFirestore.totalAmountUSD,
      actualAmountPaid: orderDataFromFirestore.actualAmountPaid,
      orderDate: (orderDataFromFirestore.orderDate as Timestamp).toDate(),
      lastUpdatedAt: (orderDataFromFirestore.lastUpdatedAt as Timestamp)?.toDate() || (orderDataFromFirestore.orderDate as Timestamp).toDate(),
      regionCode: orderDataFromFirestore.regionCode,
      currencyCode: orderDataFromFirestore.currencyCode,
      itemCount: orderDataFromFirestore.itemCount,
      status: orderDataFromFirestore.status,
      paymentGatewayId: orderDataFromFirestore.paymentGatewayId,
      paymentMethod: orderDataFromFirestore.paymentMethod,
    };
  }, []);

  useEffect(() => {
    if (authIsLoading || !orderId) {
      setIsLoadingPage(!authIsLoading); // Only stop loading if auth is also done
      if (!orderId && !authIsLoading) setError("Order ID is missing.");
      return;
    }

    if (!currentUser) {
      setError("Please log in to view your order.");
      setIsLoadingPage(false);
      return;
    }

    setIsLoadingPage(true);
    setError(null);

    const orderDocRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const orderData = docSnap.data();
        if (orderData.userId !== currentUser.uid) {
          setError("You do not have permission to view this order.");
          setOrder(null);
        } else {
          const processedOrder = await processOrderData(orderData, docSnap.id);
          setOrder(processedOrder);
          setError(null);
        }
      } else {
        setError("Order not found.");
        setOrder(null);
      }
      setIsLoadingPage(false);
      setIsRefreshingStatus(false); // Also stop manual refresh spinner if it was active
    }, (err) => {
      console.error("Error listening to order document:", err);
      setError("Failed to load order details in real-time. Please try refreshing.");
      setIsLoadingPage(false);
      setIsRefreshingStatus(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [orderId, currentUser, authIsLoading, processOrderData]);

  const manualRefreshOrderDetails = useCallback(async () => {
    if (!currentUser || !orderId) return;
    setIsRefreshingStatus(true);
    setError(null);
    try {
      // This function can re-fetch manually if needed, but onSnapshot should handle most cases.
      // For a manual refresh, we could re-trigger the onSnapshot by slightly changing a dependency,
      // or directly call getDoc once. For now, onSnapshot is primary.
      // If we want a forceful re-fetch that bypasses onSnapshot's initial state, we can do:
      const orderDocRef = doc(db, 'orders', orderId);
      const docSnap = await getDoc(orderDocRef); // Firebase getDoc, not tracking-service getOrderByIdFromDb
       if (docSnap.exists()) {
        const orderData = docSnap.data();
        if (orderData.userId !== currentUser.uid) {
          setError("You do not have permission to view this order.");
          setOrder(null);
        } else {
           const processedOrder = await processOrderData(orderData, docSnap.id);
           setOrder(processedOrder);
           setError(null);
           toast({title: "Order Status Refreshed"});
        }
      } else {
        setError("Order not found.");
        setOrder(null);
      }
    } catch (err) {
      console.error("Error manually refreshing order details:", err);
      setError("Failed to refresh order details.");
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [orderId, currentUser, processOrderData, toast]);


  const onDownloadClick = async (bookId: string, bookTitle: string, pdfUrl: string) => {
    setDownloadErrors(prev => ({ ...prev, [bookId]: null })); 

    if (!currentUser) {
      const authErrorMsg = "Log in to download.";
      setDownloadErrors(prev => ({ ...prev, [bookId]: authErrorMsg }));
      toast({ title: "Authentication Error", description: authErrorMsg, variant: "destructive" });
      return;
    }
    if (!pdfUrl || pdfUrl.includes('placeholder-book.pdf') || pdfUrl.trim() === '') {
        const noPdfMsg = `PDF for "${bookTitle}" is not available.`;
        setDownloadErrors(prev => ({ ...prev, [bookId]: noPdfMsg }));
        toast({ title: "Download Not Available", description: noPdfMsg, variant: "destructive" });
        return;
    }
    try {
      toast({ title: "Preparing Download...", description: `Checking permissions for "${bookTitle}".`});
      const result = await handleRecordDownload(bookId, currentUser.uid);
      if (result.success) {
        toast({ title: "Download Approved", description: `Starting download for "${bookTitle}".` });
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', `${bookTitle.replace(/[^a-zA-Z0-9_]/g, '_')}.pdf`); 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setDownloadErrors(prev => ({ ...prev, [bookId]: result.message || "Download denied." }));
        toast({ title: "Download Denied", description: result.message, variant: "destructive", duration: 7000 });
      }
    } catch (e: any) {
      const catchErrorMsg = e.message || "An unexpected error occurred.";
      setDownloadErrors(prev => ({ ...prev, [bookId]: catchErrorMsg }));
      toast({ title: "Download Error", description: catchErrorMsg, variant: "destructive" });
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

  if (isLoadingPage) { // Unified loading state
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Order Error" message={error} retryAction={manualRefreshOrderDetails} showHomeButton={true} />;
  }

  if (!order) {
    return <ErrorDisplay title="Order Not Found" message="The requested order could not be found or is inaccessible." showHomeButton={true} />;
  }

  let displayAmountForTotal = order.actualAmountPaid;
  let displayCurrencyForTotal = order.currencyCode;

  if (typeof order.actualAmountPaid !== 'number' || isNaN(order.actualAmountPaid)) {
    const regionForCalculation = getRegionByCode(order.regionCode) || defaultRegion;
    displayAmountForTotal = (order.totalAmountUSD || 0) * regionForCalculation.conversionRateToUSD;
  }
  const formattedOrderTotal = formatCurrency(displayAmountForTotal, displayCurrencyForTotal, order.regionCode);


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
            <div className="flex flex-col items-end space-y-2">
                <Badge className={`capitalize text-sm px-3 py-1.5 ${getStatusBadgeColorClasses(order.status)}`}>{order.status}</Badge>
                <Button variant="outline" size="xs" onClick={manualRefreshOrderDetails} disabled={isRefreshingStatus} className="mt-1 sm:mt-0">
                    {isRefreshingStatus ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : <RefreshCw className="mr-1 h-3 w-3"/>} 
                    Refresh
                </Button>
            </div>
          </div>
          <Separator className="my-3"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><strong className="font-medium text-foreground">Date Placed:</strong> {format(order.orderDate, "MMM d, yyyy 'at' h:mm a")}</p>
            <p><strong className="font-medium text-foreground">Last Updated:</strong> {format(order.lastUpdatedAt, "MMM d, yyyy 'at' h:mm a")}</p>
            <p><strong className="font-medium text-foreground">Payment Method:</strong> {order.paymentMethod || 'N/A'}</p>
            <p><strong className="font-medium text-foreground">Total:</strong> {formattedOrderTotal}</p>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {order.status === 'pending' && (
            <div className="mb-6 p-4 bg-yellow-100/70 border-l-4 border-yellow-400 rounded-md text-yellow-800">
              <div className="flex items-center font-semibold">
                <Timer className="h-5 w-5 mr-2" />
                Payment Confirmation Pending
              </div>
              <p className="text-sm mt-1">
                Your order is currently pending. The seller will confirm your payment shortly.
                Please check back later for updates or contact support if you have questions.
              </p>
              {/* Retry payment button remains relevant for pending if initial attempt failed client-side or user wants to re-try */}
              <Button asChild size="sm" className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white">
                <Link href={`/checkout/payment?order_id=${order.id}&retry_payment=true`}>
                  <CreditCard className="mr-2 h-4 w-4"/> Try Paying Again
                </Link>
              </Button>
            </div>
          )}
          
          {order.status === 'completed' && (
             <div className="mb-6 p-4 bg-green-100/70 border-l-4 border-green-500 rounded-md text-green-800">
              <p className="font-semibold flex items-center"><CheckSquare className="h-5 w-5 mr-2"/>Order Completed</p>
              <p className="text-sm mt-1">
                Your payment has been confirmed. You can now download your purchased items below.
              </p>
            </div>
          )}
          
          <h3 className="text-lg font-semibold font-headline text-foreground mb-3">Items in this Order ({order.itemCount}):</h3>
          <div className="space-y-4">
            {order.items.map((item, index) => {
               let itemPriceInOrderCurrency = item.price; 
               const regionForItem = getRegionByCode(order.regionCode) || defaultRegion;
               itemPriceInOrderCurrency = item.price * regionForItem.conversionRateToUSD;
               const formattedItemPrice = formatCurrency(itemPriceInOrderCurrency, order.currencyCode, order.regionCode);

              return (
                <div key={item.bookId || index} className="p-3 border rounded-md bg-card hover:shadow-sm transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-24 h-32 sm:w-20 sm:h-28 relative flex-shrink-0 rounded overflow-hidden shadow">
                      <Image src={item.coverImageUrl} alt={item.title} layout="fill" objectFit="cover" data-ai-hint={item.dataAiHint || 'book cover small'}/>
                    </div>
                    <div className="flex-grow">
                      <Link href={`/books/${item.bookId}`} className="hover:underline">
                        <h4 className="text-md font-semibold font-headline text-primary">{item.title}</h4>
                      </Link>
                      <p className="text-sm text-muted-foreground">Price Paid: {formattedItemPrice}</p>
                    </div>
                    {order.status === 'completed' && (
                      <div className="w-full sm:w-auto mt-2 sm:mt-0 self-start sm:self-center">
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full"
                          onClick={() => onDownloadClick(item.bookId, item.title, item.pdfUrl)}
                          disabled={!item.pdfUrl || item.pdfUrl.includes('placeholder-book.pdf') || item.pdfUrl.trim() === ''}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                        {downloadErrors[item.bookId] && (
                           <p className="text-xs text-destructive mt-1.5 text-center sm:text-left break-words">
                            {downloadErrors[item.bookId]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {(!item.pdfUrl || item.pdfUrl.includes('placeholder-book.pdf') || item.pdfUrl.trim() === '') && order.status === 'completed' && !downloadErrors[item.bookId] && (
                      <p className="text-xs text-destructive mt-1 flex items-center"><Info className="h-3 w-3 mr-1"/> PDF currently unavailable for this item.</p>
                  )}
                </div>
              );
            })}
          </div>

          {(order.status === 'failed' || order.status === 'cancelled') && (
            <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive rounded-md">
              <p className="font-semibold text-destructive-foreground flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2"/>
                Order {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </p>
              <p className="text-sm text-destructive-foreground/90 mt-1">
                {order.status === 'failed' 
                    ? "There was an issue processing the payment for this order. You can try paying again."
                    : "This order was cancelled. If you believe this is an error, please contact support."
                }
              </p>
              {order.status === 'failed' && (
                <Button asChild className="mt-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  <Link href={`/checkout/payment?order_id=${order.id}&retry_payment=true`}>
                    <CreditCard className="mr-2 h-4 w-4"/> Retry Payment
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function SpecificOrderPage() {
  return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading order details...</p>
        </div>
      }>
        <SpecificOrderPageContent />
      </Suspense>
  );
}

    
