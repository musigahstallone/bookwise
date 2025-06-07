
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Smartphone, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useRegion } from '@/contexts/RegionContext';
import { handleCreateOrder, type OrderItemInput } from '@/lib/actions/trackingActions';
import type { Book } from '@/data/books'; // For CartItem structure from session
import type { Region } from '@/data/regionData';
import ErrorDisplay from '@/components/layout/ErrorDisplay';

interface CheckoutData {
  cartItems: Book[]; // Using full Book structure as passed from cart page
  totalAmountUSD: number;
  selectedRegionCode: string;
  currencyCode: string; // Stored currency code
  itemCount: number;
}

export default function MockPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const { clearCart } = useCart();
  const { getRegionByCode, defaultRegion } = useRegion(); // For formatting

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mpesa' | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For overall page load
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

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
  }, [getRegionByCode, defaultRegion]);

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
    return `${displayRegion.currencySymbol}${formattedPrice}`;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutData || !currentUser) {
      toast({ title: "Error", description: "Missing checkout data or user not logged in.", variant: "destructive" });
      return;
    }

    setIsProcessingPayment(true);
    toast({ title: "Processing Payment...", description: "This is a mock process. Please wait." });

    // Mock 8-second delay
    await new Promise(resolve => setTimeout(resolve, 8000));

    const orderItems: OrderItemInput[] = checkoutData.cartItems.map(item => ({
        bookId: item.id,
        title: item.title,
        price: item.price, // USD price at time of purchase
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
        await clearCart(true); // Clear Firestore cart
        sessionStorage.removeItem('bookwiseCheckoutData'); // Clear checkout session data

        const purchasedItemsForSummary = orderItems.map(item => ({
            id: item.bookId,
            title: item.title,
            price: item.price,
            coverImageUrl: item.coverImageUrl,
            pdfUrl: item.pdfUrl,
            dataAiHint: item.dataAiHint,
        }));
        sessionStorage.setItem('lastPurchasedItems', JSON.stringify(purchasedItemsForSummary));
        sessionStorage.setItem('lastPurchasedRegionCode', checkoutData.selectedRegionCode); // For order summary formatting
        
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
    <div className="max-w-2xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="text-3xl font-headline">Secure Mock Payment</CardTitle>
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
             <p className="text-xs text-muted-foreground mt-1">Region: {displayRegion.name} ({displayRegion.currencyCode})</p>
          </div>

          <div className="space-y-2">
            <Label className="text-base">Choose Payment Method:</Label>
            <div className="flex gap-3">
              <Button 
                variant={paymentMethod === 'card' ? 'default' : 'outline'} 
                onClick={() => setPaymentMethod('card')}
                className="flex-1"
                disabled={isProcessingPayment}
              >
                <CreditCard className="mr-2 h-5 w-5" /> Credit/Debit Card
              </Button>
              <Button 
                variant={paymentMethod === 'mpesa' ? 'default' : 'outline'} 
                onClick={() => setPaymentMethod('mpesa')}
                className="flex-1"
                disabled={isProcessingPayment}
              >
                <Smartphone className="mr-2 h-5 w-5" /> M-Pesa
              </Button>
            </div>
          </div>

          {paymentMethod === 'card' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 p-4 border rounded-lg">
              <h4 className="text-md font-semibold">Enter Card Details (Mock)</h4>
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input id="cardNumber" type="text" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} disabled={isProcessingPayment} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input id="expiryDate" type="text" placeholder="MM/YY" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={isProcessingPayment} />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" type="text" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} disabled={isProcessingPayment} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isProcessingPayment || !cardNumber || !expiryDate || !cvv}>
                {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                Pay {formatPriceInOrderCurrency(checkoutData.totalAmountUSD)} with Card
              </Button>
            </form>
          )}

          {paymentMethod === 'mpesa' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 p-4 border rounded-lg">
              <h4 className="text-md font-semibold">M-Pesa Payment (Mock)</h4>
              <div>
                <Label htmlFor="mpesaNumber">M-Pesa Number</Label>
                <Input id="mpesaNumber" type="tel" placeholder="e.g., 0712345678" value={mpesaNumber} onChange={(e) => setMpesaNumber(e.target.value)} disabled={isProcessingPayment} />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                <AlertTriangle className="inline h-4 w-4 mr-1 mb-0.5" /> 
                You'll receive an STK push. Ensure it's from <strong className="font-medium">BOOKWISE STORES GLOBAL</strong> before entering your M-Pesa PIN.
              </div>
              <Button type="submit" className="w-full" disabled={isProcessingPayment || !mpesaNumber}>
                {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Smartphone className="mr-2 h-5 w-5" />}
                Pay {formatPriceInOrderCurrency(checkoutData.totalAmountUSD)} with M-Pesa
              </Button>
            </form>
          )}
          
          {isProcessingPayment && (
            <div className="text-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-muted-foreground">Processing your payment securely... Please do not close this page.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    