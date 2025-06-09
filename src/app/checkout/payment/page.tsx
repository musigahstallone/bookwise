
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PaymentHandler } from '@/components/checkout/PaymentHandler';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getRegionByCode, defaultRegion, type Region } from '@/data/regionData';
import type { Book } from '@/data/books'; // Full Book type for items
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { type PaymentMethod } from '@/lib/payment-service';
import { getOrderByIdFromDb, type OrderWithUserDetails } from '@/lib/tracking-service-firebase'; // For retry
import type { OrderItemInput } from '@/lib/actions/trackingActions';


interface CheckoutData {
  items: OrderItemInput[]; // Use OrderItemInput from the start
  totalAmountUSD: number; // Base USD total
  selectedRegionCode: string;
  currencyCode: string; // Currency code of the selected region for display
  itemCount: number;
  orderIdToRetry?: string; // For retrying a specific order
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const { clearCart, isLoading: cartIsLoading } = useCart();

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [displayRegion, setDisplayRegion] = useState<Region>(defaultRegion);
  const [amountInSelectedCurrency, setAmountInSelectedCurrency] = useState(0);


  useEffect(() => {
    const loadData = async () => {
      setIsLoadingPage(true);
      setError(null);
      const orderIdToRetry = searchParams.get('order_id');
      const retryPaymentFlag = searchParams.get('retry_payment');

      if (orderIdToRetry && retryPaymentFlag === 'true') {
        if (!currentUser) {
          setError("Please log in to retry your payment.");
          setIsLoadingPage(false);
          return;
        }
        try {
          const orderToRetry = await getOrderByIdFromDb(orderIdToRetry, currentUser.uid);
          if (orderToRetry && (orderToRetry.status === 'failed' || orderToRetry.status === 'pending')) {
            const regionForDisplay = getRegionByCode(orderToRetry.regionCode) || defaultRegion;
            const convertedAmount = orderToRetry.totalAmountUSD * regionForDisplay.conversionRateToUSD;
            const finalDisplayAmount = regionForDisplay.currencyCode === 'KES' ? Math.round(convertedAmount) : parseFloat(convertedAmount.toFixed(2));
            
            setCheckoutData({
              items: orderToRetry.items.map(item => ({ // Ensure mapping to OrderItemInput
                bookId: item.bookId,
                title: item.title,
                price: item.price, // Price should be from the original order item
                coverImageUrl: item.coverImageUrl,
                pdfUrl: item.pdfUrl,
                dataAiHint: item.dataAiHint,
              })),
              totalAmountUSD: orderToRetry.totalAmountUSD,
              selectedRegionCode: orderToRetry.regionCode,
              currencyCode: orderToRetry.currencyCode,
              itemCount: orderToRetry.itemCount,
              orderIdToRetry: orderIdToRetry,
            });
            setDisplayRegion(regionForDisplay);
            setAmountInSelectedCurrency(finalDisplayAmount);
          } else if (orderToRetry && orderToRetry.status === 'completed') {
            setError(`Order ${orderIdToRetry} is already completed. No payment needed.`);
             setTimeout(() => router.push(`/orders/${orderIdToRetry}`), 3000);
          } 
          else {
            setError(`Could not find order ${orderIdToRetry} to retry, or it's not in a retryable state.`);
          }
        } catch (e) {
          console.error("Error fetching order to retry:", e);
          setError("Could not load order details for retry. Please try again from 'My Orders'.");
        }
      } else {
        const dataString = sessionStorage.getItem('bookwiseCheckoutData');
        if (dataString) {
          try {
            const parsedData: Omit<CheckoutData, 'items'> & { cartItems: Book[] } = JSON.parse(dataString); // cartItems is Book[] from session
            if (!parsedData.cartItems || parsedData.cartItems.length === 0) {
              setError("No items in cart for checkout. Please return to your cart.");
              setCheckoutData(null);
            } else {
              const regionForDisplay = getRegionByCode(parsedData.selectedRegionCode) || defaultRegion;
              const convertedAmount = parsedData.totalAmountUSD * regionForDisplay.conversionRateToUSD;
              const finalDisplayAmount = regionForDisplay.currencyCode === 'KES' ? Math.round(convertedAmount) : parseFloat(convertedAmount.toFixed(2));

              setCheckoutData({
                items: parsedData.cartItems.map(book => ({ // Map Book to OrderItemInput
                    bookId: book.id,
                    title: book.title,
                    price: book.price, // This is USD price from book catalog
                    coverImageUrl: book.coverImageUrl,
                    pdfUrl: book.pdfUrl,
                    dataAiHint: book.dataAiHint,
                })),
                totalAmountUSD: parsedData.totalAmountUSD,
                selectedRegionCode: parsedData.selectedRegionCode,
                currencyCode: parsedData.currencyCode,
                itemCount: parsedData.itemCount,
              });
              setDisplayRegion(regionForDisplay);
              setAmountInSelectedCurrency(finalDisplayAmount);
            }
          } catch (e) {
            console.error("Error parsing checkout data from session storage:", e);
            setError("Could not load checkout details. Please try again from your cart.");
            setCheckoutData(null);
          }
        } else {
          setError("No checkout information found. Redirecting to shop...");
          setCheckoutData(null);
          router.replace('/shop'); // Redirect if no data
        }
      }
      setIsLoadingPage(false);
    };
    if (!authIsLoading) { // Only load data once auth state is resolved
        loadData();
    }
  }, [searchParams, router, currentUser, authIsLoading]);


  const formatPriceInOrderCurrency = (amount: number, region: Region): string => {
    let formattedPrice;
    if (region.currencyCode === 'KES') {
        if (Math.abs(amount - Math.round(amount)) < 0.005) {
             formattedPrice = Math.round(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
             formattedPrice = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    } else {
         formattedPrice = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${region.currencySymbol}${formattedPrice}`;
  };

  const handlePaymentInitiationSuccess = async (orderId: string, paymentGatewayId: string, method: PaymentMethod, message?: string) => {
    if (!checkoutData || !currentUser) {
      toast({ title: "Error", description: "Missing checkout data or user not logged in.", variant: "destructive" });
      return;
    }
    
    // Clear cart only if this wasn't a retry of an existing order
    if (!checkoutData.orderIdToRetry) {
      await clearCart(true); 
      sessionStorage.removeItem('bookwiseCheckoutData');
    }

    let toastMessage = message || "Payment initiated. Your order is being processed.";
    if (method === 'mpesa') {
      toastMessage = message || "STK Push sent. Please complete payment on your phone. Your order is being processed.";
    } else if (method === 'stripe') {
       toastMessage = message || "Processing your Stripe payment. Your order status will update shortly.";
    } else if (method === 'mock') {
       toastMessage = message || "Mock Payment Successful! Order created.";
    }
    
    toast({ 
        title: method === 'mock' ? "Mock Payment Complete!" : "Payment Processing", 
        description: `${toastMessage} You will be redirected to view your order.`,
        duration: 10000 
    });
    
    router.push(`/orders/${orderId}`);
  };

  const handlePaymentError = (errorMessage: string, orderId?: string) => {
    toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
        duration: 7000,
    });
    if (orderId) {
      // If an orderId exists (meaning a pending order was created or we are retrying)
      // keep the user on the payment page, or redirect them to the specific order page to retry.
      // For now, we'll keep them here, error is shown by PaymentHandler.
      // Or, if it's a retry:
      if (checkoutData?.orderIdToRetry) {
        router.push(`/orders/${checkoutData.orderIdToRetry}?payment_failed=true`);
      }
    }
    // If no orderId, it implies a very early failure, let user retry or select another method.
  }


  if (authIsLoading || isLoadingPage || cartIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Payment Page...</p>
      </div>
    );
  }

  if (error || !checkoutData || !checkoutData.items || checkoutData.items.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <ErrorDisplay
            title="Payment Page Error"
            message={error || "Could not load payment details or cart is empty. Please return to your cart or shop."}
            showHomeButton={false}
            retryAction={() => router.push(checkoutData?.orderIdToRetry ? `/orders/${checkoutData.orderIdToRetry}` : '/cart')}
            className="max-w-2xl mx-auto"
        />
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <ErrorDisplay
            title="Authentication Required"
            message="You need to be logged in to complete the payment."
            retryAction={() => router.push(`/login?redirectUrl=/checkout/payment${checkoutData.orderIdToRetry ? `?order_id=${checkoutData.orderIdToRetry}&retry_payment=true` : ''}`)}
            showHomeButton={false}
            className="max-w-2xl mx-auto"
        />
      </div>
    )
  }
  
  // Determine API amount and currency based on selected payment method contextually in PaymentHandler
  // For now, pass base USD and display currency details. PaymentHandler will decide final API values.
  const itemsForPaymentHandler: OrderItemInput[] = checkoutData.items.map(item => ({
    bookId: item.bookId,
    title: item.title,
    // price for OrderItemInput should be the price in the order's currency if retrying,
    // or the base USD price from catalog if new order
    price: checkoutData.orderIdToRetry ? item.price : item.price, // Assuming item.price is already correct from source
    coverImageUrl: item.coverImageUrl,
    pdfUrl: item.pdfUrl,
    dataAiHint: item.dataAiHint,
  }));


  return (
    <div className="container max-w-2xl mx-auto py-6 sm:py-8 px-2 sm:px-4">
      <Card className="shadow-xl w-full">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-primary mb-2 sm:mb-3" />
          <CardTitle className="text-2xl sm:text-3xl font-headline">{checkoutData.orderIdToRetry ? `Retry Payment for Order` : `Secure Checkout`}</CardTitle>
          {checkoutData.orderIdToRetry && <CardDescription className="text-sm sm:text-base">Order ID: {checkoutData.orderIdToRetry}</CardDescription>}
          {!checkoutData.orderIdToRetry && <CardDescription className="text-sm sm:text-base">Complete your purchase for BookWise.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <Card className="p-3 sm:p-4 border rounded-lg bg-muted/30">
            <h3 className="text-md sm:text-lg font-semibold mb-1 sm:mb-2">Order Summary</h3>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-muted-foreground">Total Items:</span>
              <span className="font-medium">{checkoutData.itemCount}</span>
            </div>
            <div className="flex justify-between font-bold text-lg sm:text-xl text-primary mt-1">
              <span>Amount Due:</span>
              <span>{formatPriceInOrderCurrency(amountInSelectedCurrency, displayRegion)}</span>
            </div>
            {displayRegion.currencyCode !== 'USD' && (
                 <p className="text-xs text-muted-foreground mt-1">
                    (Original total: USD {checkoutData.totalAmountUSD.toFixed(2)})
                </p>
            )}
          </Card>
          
          <PaymentHandler
              amountUSD={checkoutData.totalAmountUSD}
              userId={currentUser.uid}
              items={itemsForPaymentHandler} 
              email={currentUser.email || undefined}
              onSuccess={handlePaymentInitiationSuccess}
              onError={handlePaymentError}
              regionCode={checkoutData.selectedRegionCode} // Pass the region code of the order
              itemCount={checkoutData.itemCount}
              // No currencyCodeForDisplay or amountInSelectedCurrency here, PaymentHandler calculates from regionCode and amountUSD
          />
        </CardContent>
      </Card>
    </div>
  );
}


export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Payment Details...</p>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}


    