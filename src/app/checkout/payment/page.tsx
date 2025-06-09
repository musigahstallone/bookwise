
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
import type { Book } from '@/data/books';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { type PaymentMethod } from '@/lib/payment-service';


interface CheckoutData {
  cartItems: Book[]; 
  totalAmountUSD: number;
  selectedRegionCode: string;
  currencyCode: string; // Currency code of the selected region for display
  itemCount: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const { clearCart, isLoading: cartIsLoading } = useCart();

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        // Ensure KES is always displayed as a whole number if it's an integer
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

  // This function is called by PaymentHandler upon successful initiation or completion.
  const handlePaymentInitiationSuccess = async (paymentId: string, method: PaymentMethod, message?: string) => {
    if (!checkoutData || !currentUser) {
      toast({ title: "Error", description: "Missing checkout data or user not logged in.", variant: "destructive" });
      return;
    }
    
    await clearCart(true); // Clear cart from client-side (context and localStorage/Firestore)
    sessionStorage.removeItem('bookwiseCheckoutData');

    if (method === 'mpesa') {
      toast({ 
        title: "M-Pesa Processing", 
        description: message || "STK Push sent. Please complete payment on your phone. Your order will appear in 'My Orders' once confirmed.",
        duration: 10000 
      });
    } else if (method === 'stripe') {
      toast({
        title: "Stripe Payment Processing",
        description: message || "Processing your payment. Your order will appear in 'My Orders' shortly upon confirmation.",
        duration: 8000,
      });
    } else if (method === 'mock') {
       toast({
        title: "Mock Payment Successful!",
        description: message || "Order Received! Your order has been processed and will appear in 'My Orders'.",
        duration: 8000,
      });
    }
    
    router.push(`/my-orders`); // Redirect to My Orders for all methods after initiation/success
  };


  if (authIsLoading || isLoadingPage || cartIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Payment Page...</p>
      </div>
    );
  }

  if (error || !checkoutData || !checkoutData.cartItems || checkoutData.cartItems.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <ErrorDisplay
            title="Payment Page Error"
            message={error || "Could not load payment details or cart is empty. Please return to your cart."}
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

  // Map Book[] to OrderItemInput[]
  const orderItemsForPayment: OrderItemInput[] = checkoutData.cartItems.map(book => ({
    bookId: book.id,
    title: book.title,
    price: book.price, // Assuming book.price is already in USD here, or adjust as needed
    coverImageUrl: book.coverImageUrl,
    pdfUrl: book.pdfUrl,
    dataAiHint: book.dataAiHint || 'book cover',
  }));

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
          
          <PaymentHandler
              amount={checkoutData.totalAmountUSD} // Base USD total
              userId={currentUser.uid}
              items={orderItemsForPayment} 
              email={currentUser.email || undefined}
              onSuccess={handlePaymentInitiationSuccess} // Renamed for clarity
              onError={(errorMessage) => {
              toast({
                  title: "Payment Error",
                  description: errorMessage,
                  variant: "destructive",
                  duration: 7000,
              });
              }}
              currencyCodeForDisplay={displayRegion.currencyCode} // e.g. KES, EUR
              amountInSelectedCurrency={amountInSelectedCurrency} // Actual numeric value in display currency
              regionCode={checkoutData.selectedRegionCode}
              itemCount={checkoutData.itemCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
