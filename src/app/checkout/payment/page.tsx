
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck } from 'lucide-react';
import { PaymentHandler } from '@/components/checkout/PaymentHandler';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getRegionByCode, defaultRegion, type Region } from '@/data/regionData';
// Order creation for M-Pesa is now handled by webhook. For mock/Stripe, it might still be client-triggered if immediate.
// For this refactor, order creation for M-Pesa is removed from here.
// import { handleCreateOrder, type OrderItemInput } from '@/lib/actions/trackingActions';
import type { Book } from '@/data/books';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { type PaymentMethod } from '@/lib/payment-service';


interface CheckoutData {
  cartItems: Book[]; // Using Book type here, which aligns with OrderItemInput structure
  totalAmountUSD: number;
  selectedRegionCode: string;
  currencyCode: string;
  itemCount: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const { clearCart } = useCart(); // Still need to clear cart on some success paths

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false); // For final steps AFTER payment handler gives success

  const [displayRegion, setDisplayRegion] = useState<Region>(defaultRegion);
  const [amountInSelectedCurrency, setAmountInSelectedCurrency] = useState(0);


  useEffect(() => {
    const dataString = sessionStorage.getItem('bookwiseCheckoutData');
    if (dataString) {
      try {
        const parsedData: CheckoutData = JSON.parse(dataString);
        if (!parsedData.cartItems || parsedData.cartItems.length === 0) {
          setError("No items in cart for checkout. Please return to your cart.");
          setCheckoutData(null);
          setIsLoadingPage(false);
          return;
        }
        setCheckoutData(parsedData);
        const regionForDisplay = getRegionByCode(parsedData.selectedRegionCode) || defaultRegion;
        setDisplayRegion(regionForDisplay);

        const convertedAmount = parsedData.totalAmountUSD * regionForDisplay.conversionRateToUSD;
        let finalDisplayAmount;
         if (regionForDisplay.currencyCode === 'KES') {
            finalDisplayAmount = Math.round(convertedAmount);
        } else {
            finalDisplayAmount = parseFloat(convertedAmount.toFixed(2));
        }
        setAmountInSelectedCurrency(finalDisplayAmount);

      } catch (e) {
        console.error("Error parsing checkout data from session storage:", e);
        setError("Could not load checkout details. Please try again from your cart.");
        setCheckoutData(null);
      }
    } else {
      setError("No checkout information found. Please start from your cart.");
      setCheckoutData(null);
    }
    setIsLoadingPage(false);
  }, []);


  const formatPriceInOrderCurrency = (amount: number, region: Region): string => {
    let formattedPrice;
    if (region.currencyCode === 'KES') {
        formattedPrice = Math.round(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
        formattedPrice = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${region.currencyCode} ${formattedPrice}`;
  };


  const handlePaymentSuccess = async (paymentId: string, method: PaymentMethod, message?: string) => {
    if (!checkoutData || !currentUser) {
      toast({ title: "Error", description: "Missing checkout data or user not logged in.", variant: "destructive" });
      setIsProcessingOrder(false);
      return;
    }

    setIsProcessingOrder(true); // Indicates final client-side steps are running

    if (method === 'mpesa') {
      toast({ 
        title: "M-Pesa Processing", 
        description: message || "STK Push sent. Please complete payment on your phone. Your order will appear in 'My Orders' once confirmed.",
        duration: 10000 
      });
      await clearCart(true); // Clear cart after initiating M-Pesa
      sessionStorage.removeItem('bookwiseCheckoutData');
      router.push(`/my-orders`);
      // Order creation for M-Pesa is now handled by the webhook.
    } else if (method === 'stripe') {
      // For Stripe, if paymentIntent status is 'succeeded' client-side, we might still create order here
      // OR rely purely on webhook. Current setup: webhook (`finalizeStripeTransactionAndCreateOrder`) handles order creation.
      // So, just show success and redirect.
      toast({
        title: "Stripe Payment Confirmed",
        description: "Processing your order. It will appear in 'My Orders' shortly.",
        duration: 8000,
      });
      await clearCart(true);
      sessionStorage.removeItem('bookwiseCheckoutData');
      router.push('/my-orders');
    } else if (method === 'mock') {
      // Mock payment's order creation is handled within payment-service.ts for simplicity
      toast({
        title: "Mock Payment Successful!",
        description: "Order Received! Your order has been processed and will appear in 'My Orders'.",
        duration: 8000,
      });
      await clearCart(true);
      sessionStorage.removeItem('bookwiseCheckoutData');
      router.push(`/my-orders`);
    }
    // Any other methods would need their specific post-payment client handling here.
    setIsProcessingOrder(false);
  };


  if (authIsLoading || isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Payment Page...</p>
      </div>
    );
  }

  if (error || !checkoutData) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <ErrorDisplay
            title="Payment Page Error"
            message={error || "Could not load payment details. Please return to your cart."}
            showHomeButton={false}
            retryAction={() => router.push('/cart')}
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
            retryAction={() => router.push(`/login?redirectUrl=/checkout/payment`)}
            showHomeButton={false}
            className="max-w-2xl mx-auto"
        />
      </div>
    )
  }
  return (
    <div className="container max-w-2xl mx-auto py-6 sm:py-8 px-2 sm:px-4">
      <Card className="shadow-xl w-full">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-primary mb-2 sm:mb-3" />
          <CardTitle className="text-2xl sm:text-3xl font-headline">Secure Checkout</CardTitle>
          <CardDescription className="text-sm sm:text-base">Complete your purchase for BookWise.</CardDescription>
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
          
          {isProcessingOrder ? ( // This state is for AFTER PaymentHandler success, for client-side cleanup/redirect
             <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary mb-2 sm:mb-3" />
                <p className="text-md sm:text-lg font-semibold text-foreground">Finalizing...</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Please do not refresh or close this page.</p>
            </div>
          ) : (
            <PaymentHandler
                amount={checkoutData.totalAmountUSD} // Base USD for Stripe, KES for M-Pesa if currency is KES
                userId={currentUser.uid}
                items={checkoutData.cartItems} // Pass full cart items
                email={currentUser.email || undefined}
                onSuccess={handlePaymentSuccess}
                onError={(errorMessage) => {
                toast({
                    title: "Payment Error",
                    description: errorMessage,
                    variant: "destructive",
                    duration: 7000,
                });
                }}
                currencyCodeForDisplay={displayRegion.currencyCode}
                amountInSelectedCurrency={amountInSelectedCurrency}
                regionCode={checkoutData.selectedRegionCode} // Pass regionCode
                itemCount={checkoutData.itemCount} // Pass itemCount
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

