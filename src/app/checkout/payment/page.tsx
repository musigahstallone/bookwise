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
import { handleCreateOrder, type OrderItemInput } from '@/lib/actions/trackingActions';
import type { Book } from '@/data/books';
import ErrorDisplay from '@/components/layout/ErrorDisplay';

interface CheckoutData {
  cartItems: Book[];
  totalAmountUSD: number;
  selectedRegionCode: string;
  currencyCode: string;
  itemCount: number;
}

export default function MockPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const { clearCart } = useCart();

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayRegion, setDisplayRegion] = useState<Region>(defaultRegion);

  useEffect(() => {
    const dataString = sessionStorage.getItem('bookwiseCheckoutData');
    if (dataString) {
      try {
        const parsedData: CheckoutData = JSON.parse(dataString);
        setCheckoutData(parsedData);
        const region = getRegionByCode(parsedData.selectedRegionCode) || defaultRegion;
        setDisplayRegion(region);
      } catch (e) {
        console.error("Error parsing checkout data from session storage:", e);
        setError("Could not load checkout details. Please try again from your cart.");
      }
    } else {
      setError("No checkout information found. Please start from your cart.");
    }
    setIsLoading(false);
  }, []);

  const formatPriceInOrderCurrency = (usdPrice: number): string => {
    const convertedPrice = usdPrice * displayRegion.conversionRateToUSD;
    let formattedPrice;
    if (displayRegion.currencyCode === 'KES') {
      if (Math.abs(convertedPrice - Math.round(convertedPrice)) < 0.005) {
        formattedPrice = Math.round(convertedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      } else {
        formattedPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    } else {
      formattedPrice = convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${displayRegion.currencyCode} ${formattedPrice}`;
  };
  const handlePaymentSuccess = async (paymentId: string) => {
    if (!checkoutData || !currentUser) {
      toast({
        title: "Error",
        description: "Missing checkout data or user not logged in.",
        variant: "destructive"
      });
      return;
    }

    const orderItems: OrderItemInput[] = checkoutData.cartItems.map(item => ({
      bookId: item.id,
      title: item.title,
      price: item.price,
      coverImageUrl: item.coverImageUrl,
      pdfUrl: item.pdfUrl,
      dataAiHint: item.dataAiHint || 'book cover',
    }));

    try {
      const orderResult = await handleCreateOrder(
        currentUser.uid,
        orderItems,
        checkoutData.totalAmountUSD,
        checkoutData.selectedRegionCode,
        checkoutData.currencyCode,
        checkoutData.itemCount
      );

      if (orderResult.success && orderResult.orderId) {
        await clearCart(true);
        sessionStorage.removeItem('bookwiseCheckoutData');

        const purchasedItemsForSummary = orderItems.map(item => ({
          id: item.bookId,
          title: item.title,
          price: item.price,
          coverImageUrl: item.coverImageUrl,
          pdfUrl: item.pdfUrl,
          dataAiHint: item.dataAiHint,
        }));
        sessionStorage.setItem('lastPurchasedItems', JSON.stringify(purchasedItemsForSummary));
        sessionStorage.setItem('lastPurchasedRegionCode', checkoutData.selectedRegionCode);

        toast({
          title: "Payment Successful!",
          description: "Your order has been recorded. Redirecting...",
        });
        router.push(`/order-summary`);
      } else {
        toast({
          title: "Order Creation Failed",
          description: orderResult.message || "Could not process your order. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error during order creation:", err);
      toast({
        title: "Checkout Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutData || !currentUser) {
      toast({ title: "Error", description: "Missing checkout data or user not logged in.", variant: "destructive" });
      return;
    }

    setIsProcessingPayment(true);
    toast({ title: "Processing Payment...", description: "This is a mock process. Please wait." });

    await new Promise(resolve => setTimeout(resolve, 8000));

    const orderItems: OrderItemInput[] = checkoutData.cartItems.map(item => ({
      bookId: item.id,
      title: item.title,
      price: item.price,
      coverImageUrl: item.coverImageUrl,
      pdfUrl: item.pdfUrl,
      dataAiHint: item.dataAiHint || 'book cover',
    }));

    try {
      const orderResult = await handleCreateOrder(
        currentUser.uid,
        orderItems,
        checkoutData.totalAmountUSD,
        checkoutData.selectedRegionCode,
        checkoutData.currencyCode,
        checkoutData.itemCount
      );

      if (orderResult.success && orderResult.orderId) {
        await clearCart(true);
        sessionStorage.removeItem('bookwiseCheckoutData');

        const purchasedItemsForSummary = orderItems.map(item => ({
          id: item.bookId,
          title: item.title,
          price: item.price,
          coverImageUrl: item.coverImageUrl,
          pdfUrl: item.pdfUrl,
          dataAiHint: item.dataAiHint,
        }));
        sessionStorage.setItem('lastPurchasedItems', JSON.stringify(purchasedItemsForSummary));
        sessionStorage.setItem('lastPurchasedRegionCode', checkoutData.selectedRegionCode);

        toast({
          title: "Mock Payment Successful!",
          description: "Your order has been recorded. Redirecting...",
        });
        router.push(`/order-summary`);
      } else {
        toast({
          title: "Order Creation Failed",
          description: orderResult.message || "Could not process your order. Please try again.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
      }
    } catch (err) {
      console.error("Error during order creation:", err);
      toast({
        title: "Checkout Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  if (authIsLoading || isLoading) {
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
        title="Payment Error"
        message={error || "Could not load payment details. Please return to your cart."}
        showHomeButton={false}
        retryAction={() => router.push('/cart')}
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
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
            <div className="flex justify-between">
              <span>Total Items:</span>
              <span>{checkoutData.itemCount}</span>
            </div>
            <div className="flex justify-between font-bold text-xl text-primary mt-1">
              <span>Amount Due:</span>
              <span>{formatPriceInOrderCurrency(checkoutData.totalAmountUSD)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Region: {displayRegion.name} ({displayRegion.currencyCode})
            </p>
          </div>

          <PaymentHandler
            amount={checkoutData.totalAmountUSD}
            userId={currentUser.uid}
            bookId={checkoutData.cartItems[0].id}
            email={currentUser.email || undefined}
            onSuccess={handlePaymentSuccess}
            onError={(errorMessage) => {
              toast({
                title: "Payment Error",
                description: errorMessage,
                variant: "destructive"
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
function setIsProcessingPayment(arg0: boolean) {
  throw new Error('Function not implemented.');
}

