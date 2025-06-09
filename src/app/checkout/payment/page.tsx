
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PaymentHandler } from '@/components/checkout/PaymentHandler';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getRegionByCode, defaultRegion, type Region } from '@/data/regionData';
import { handleCreateOrder, type OrderItemInput } from '@/lib/actions/trackingActions';
import type { Book } from '@/data/books';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { type PaymentMethod } from '@/lib/payment-service';


interface CheckoutData {
  cartItems: Book[];
  totalAmountUSD: number;
  selectedRegionCode: string;
  currencyCode: string; // Currency code of the selected region (USD, EUR, KES)
  itemCount: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const { clearCart } = useCart();

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const [displayRegion, setDisplayRegion] = useState<Region>(defaultRegion);
  const [amountInSelectedCurrency, setAmountInSelectedCurrency] = useState(0);


  useEffect(() => {
    const dataString = sessionStorage.getItem('bookwiseCheckoutData');
    if (dataString) {
      try {
        const parsedData: CheckoutData = JSON.parse(dataString);
        setCheckoutData(parsedData);
        const regionForDisplay = getRegionByCode(parsedData.selectedRegionCode) || defaultRegion;
        setDisplayRegion(regionForDisplay);

        const convertedAmount = parsedData.totalAmountUSD * regionForDisplay.conversionRateToUSD;
        let finalDisplayAmount;
         if (regionForDisplay.currencyCode === 'KES') {
            if (Math.abs(convertedAmount - Math.round(convertedAmount)) < 0.005) { // Check if close to whole number
                finalDisplayAmount = Math.round(convertedAmount);
            } else {
                finalDisplayAmount = parseFloat(convertedAmount.toFixed(2));
            }
        } else {
            finalDisplayAmount = parseFloat(convertedAmount.toFixed(2));
        }
        setAmountInSelectedCurrency(finalDisplayAmount);


      } catch (e) {
        console.error("Error parsing checkout data from session storage:", e);
        setError("Could not load checkout details. Please try again from your cart.");
      }
    } else {
      setError("No checkout information found. Please start from your cart.");
    }
    setIsLoadingPage(false);
  }, []);


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
    return `${region.currencyCode} ${formattedPrice}`;
  };


  const handlePaymentSuccess = async (paymentId: string, method: PaymentMethod) => {
    if (!checkoutData || !currentUser) {
      toast({
        title: "Error",
        description: "Missing checkout data or user not logged in.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingOrder(true);
    toast({ title: "Finalizing Order...", description: "Please wait a moment." });

    const orderItems: OrderItemInput[] = checkoutData.cartItems.map(item => ({
      bookId: item.id,
      title: item.title,
      price: item.price, // Store original USD price
      coverImageUrl: item.coverImageUrl,
      pdfUrl: item.pdfUrl,
      dataAiHint: item.dataAiHint || 'book cover',
    }));

    try {
      const orderResult = await handleCreateOrder(
        currentUser.uid,
        orderItems,
        checkoutData.totalAmountUSD, // Store total in USD for consistency
        checkoutData.selectedRegionCode,
        checkoutData.currencyCode, // Store the currency code of the transaction
        checkoutData.itemCount,
        paymentId, // Store the payment ID from the gateway
        method // Store the payment method used
      );

      if (orderResult.success && orderResult.orderId) {
        await clearCart(true); // Clear Firestore cart silently
        sessionStorage.removeItem('bookwiseCheckoutData');

        // Prepare data for order summary page
        const purchasedItemsForSummary = orderItems.map(item => ({
          id: item.bookId,
          title: item.title,
          price: item.price, // USD price
          coverImageUrl: item.coverImageUrl,
          pdfUrl: item.pdfUrl,
          dataAiHint: item.dataAiHint,
        }));
        sessionStorage.setItem('lastPurchasedItems', JSON.stringify(purchasedItemsForSummary));
        // Store the region code used for the transaction for consistent display on summary
        sessionStorage.setItem('lastPurchasedRegionCode', checkoutData.selectedRegionCode); 

        toast({
          title: "Payment Successful!",
          description: "Your order has been recorded. Redirecting...",
        });
        router.push(`/order-summary`);
      } else {
        toast({
          title: "Order Creation Failed",
          description: orderResult.message || "Could not process your order after payment. Please contact support with your payment ID.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error during order creation:", err);
      toast({
        title: "Checkout Error",
        description: "An unexpected error occurred while finalizing your order. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingOrder(false);
    }
  };


  if (authIsLoading || isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Payment Page...</p>
      </div>
    );
  }

  if (error || !checkoutData) {
    return (
      <ErrorDisplay
        title="Payment Page Error"
        message={error || "Could not load payment details. Please return to your cart."}
        showHomeButton={false}
        retryAction={() => router.push('/cart')}
        className="max-w-2xl mx-auto"
      />
    );
  }

  if (!currentUser) {
    return (
      <ErrorDisplay
        title="Authentication Required"
        message="You need to be logged in to complete the payment."
        retryAction={() => router.push(`/login?redirectUrl=/checkout/payment`)}
        showHomeButton={false}
        className="max-w-2xl mx-auto"
      />
    )
  }
  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="text-3xl font-headline">Secure Checkout</CardTitle>
          <CardDescription>Complete your purchase for BookWise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Items:</span>
              <span className="font-medium">{checkoutData.itemCount}</span>
            </div>
            <div className="flex justify-between font-bold text-xl text-primary mt-1">
              <span>Amount Due:</span>
              <span>{formatPriceInOrderCurrency(amountInSelectedCurrency, displayRegion)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              (Original total: USD {checkoutData.totalAmountUSD.toFixed(2)})
            </p>
          </Card>
          
          {isProcessingOrder ? (
             <div className="flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-lg font-semibold text-foreground">Finalizing your order...</p>
                <p className="text-sm text-muted-foreground">Please do not refresh or close this page.</p>
            </div>
          ) : (
            <PaymentHandler
                amount={checkoutData.totalAmountUSD} // Pass base USD amount for Stripe
                userId={currentUser.uid}
                bookId={checkoutData.cartItems[0]?.id || 'multiple_items'} // Simplified for now
                email={currentUser.email || undefined}
                onSuccess={handlePaymentSuccess}
                onError={(errorMessage) => {
                toast({
                    title: "Payment Error",
                    description: errorMessage,
                    variant: "destructive"
                });
                }}
                currencyCodeForDisplay={displayRegion.currencyCode}
                amountInSelectedCurrency={amountInSelectedCurrency}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
