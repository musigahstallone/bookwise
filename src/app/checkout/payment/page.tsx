
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Smartphone, AlertTriangle, ShieldCheck } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mpesa' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isCardNumberValid, setIsCardNumberValid] = useState(false);
  const [isExpiryDateValid, setIsExpiryDateValid] = useState(false);
  const [isCvvValid, setIsCvvValid] = useState(false);

  // M-Pesa state
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [isMpesaNumberValid, setIsMpesaNumberValid] = useState(false);
  const [mpesaAmountKES, setMpesaAmountKES] = useState('');

  const [displayRegion, setDisplayRegion] = useState<Region>(defaultRegion);

  useEffect(() => {
    const dataString = sessionStorage.getItem('bookwiseCheckoutData');
    if (dataString) {
      try {
        const parsedData: CheckoutData = JSON.parse(dataString);
        setCheckoutData(parsedData);
        const region = getRegionByCode(parsedData.selectedRegionCode) || defaultRegion;
        setDisplayRegion(region);

        if (parsedData.totalAmountUSD) {
            const kesRegionDetails = getRegionByCode('KE'); 
            if (kesRegionDetails) {
                const amountInKES = parsedData.totalAmountUSD * kesRegionDetails.conversionRateToUSD;
                let formattedKESPrice;
                if (Math.abs(amountInKES - Math.round(amountInKES)) < 0.005) {
                    formattedKESPrice = Math.round(amountInKES).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                } else {
                    formattedKESPrice = amountInKES.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                setMpesaAmountKES(`${kesRegionDetails.currencyCode} ${formattedKESPrice}`);
            }
        }

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

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); 
    const limitedValue = rawValue.slice(0, 16); 

    let formattedValue = '';
    for (let i = 0; i < limitedValue.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += ' ';
      }
      formattedValue += limitedValue[i];
    }
    setCardNumber(formattedValue);
    setIsCardNumberValid(limitedValue.length === 16);
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, ''); 
    let formattedValue = rawValue;

    if (rawValue.length > 2) {
      formattedValue = rawValue.slice(0, 2) + '/' + rawValue.slice(2, 4);
    } else if (rawValue.length <=2 && expiryDate.endsWith('/') && e.nativeEvent.inputType === 'deleteContentBackward') {
         formattedValue = rawValue.slice(0, rawValue.length);
    }
    
    if (formattedValue.length > 5) {
        formattedValue = formattedValue.slice(0,5);
    }

    setExpiryDate(formattedValue);
    const parts = formattedValue.split('/');
    if (parts.length === 2) {
        const month = parseInt(parts[0], 10);
        const year = parseInt(parts[1], 10);
        const currentYearShort = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        const isValidMonth = month >= 1 && month <= 12;
        // Check if year is current or future, and if current year, month is current or future
        const isValidYear = year > currentYearShort || (year === currentYearShort && month >= currentMonth);
        setIsExpiryDateValid(formattedValue.length === 5 && isValidMonth && isValidYear);
    } else {
        setIsExpiryDateValid(false);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); 
    const limitedValue = rawValue.slice(0, 3); 
    setCvv(limitedValue);
    setIsCvvValid(limitedValue.length === 3);
  };
  
  const handleMpesaNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); 
    const limitedValue = value.slice(0,10); 
    setMpesaNumber(limitedValue);
    setIsMpesaNumberValid(/^(07|01)\d{8}$/.test(limitedValue));
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
                <Input 
                  id="cardNumber" 
                  type="text" 
                  placeholder="0000 0000 0000 0000" 
                  value={cardNumber} 
                  onChange={handleCardNumberChange} 
                  disabled={isProcessingPayment} 
                  maxLength={19} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input 
                    id="expiryDate" 
                    type="text" 
                    placeholder="MM/YY" 
                    value={expiryDate} 
                    onChange={handleExpiryDateChange} 
                    disabled={isProcessingPayment}
                    maxLength={5} 
                   />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input 
                    id="cvv" 
                    type="text" 
                    placeholder="123" 
                    value={cvv} 
                    onChange={handleCvvChange} 
                    disabled={isProcessingPayment}
                    maxLength={3}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Card payments are processed in {displayRegion.currencyCode}.</p>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isProcessingPayment || !isCardNumberValid || !isExpiryDateValid || !isCvvValid}
              >
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
                <Input 
                    id="mpesaNumber" 
                    type="tel" 
                    placeholder="e.g., 0712345678" 
                    value={mpesaNumber} 
                    onChange={handleMpesaNumberChange} 
                    disabled={isProcessingPayment} 
                    maxLength={10}
                />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                <p className="font-medium">Please pay: {mpesaAmountKES}</p>
                <AlertTriangle className="inline h-4 w-4 mr-1 mb-0.5" />
                You'll receive an STK push. Ensure it's from <strong className="font-medium">BOOKWISE STORES GLOBAL</strong> before entering your M-Pesa PIN.
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isProcessingPayment || !isMpesaNumberValid}
              >
                {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Smartphone className="mr-2 h-5 w-5" />}
                Pay {mpesaAmountKES} with M-Pesa
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
