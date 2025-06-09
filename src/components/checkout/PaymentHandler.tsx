
"use client";

import { useEffect, useState } from 'react';
import { PaymentSelector } from '@/components/checkout/PaymentSelector';
import { MpesaForm } from '@/components/checkout/MpesaForm';
import { StripeForm } from '@/components/checkout/StripeForm';
import { type PaymentMethod } from '@/lib/payment-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getRegionByCode, defaultRegion } from '@/data/regionData'; // Import for KES conversion

interface PaymentHandlerProps {
    amount: number; // Base amount in USD for Stripe
    userId: string;
    bookId: string; 
    email?: string;
    onSuccess: (paymentId: string, method: PaymentMethod) => void;
    onError: (error: string) => void;
    currencyCodeForDisplay: string; 
    amountInSelectedCurrency: number; 
}

// Helper function to normalize Kenyan phone numbers to 254xxxxxxxxx format
const normalizeKenyanPhoneNumber = (phoneNumber: string): string => {
    let normalized = phoneNumber.trim();
    if (normalized.startsWith('+254')) {
        normalized = normalized.substring(1); // Remove +
    }
    if (normalized.startsWith('07')) {
        normalized = '254' + normalized.substring(1);
    } else if (normalized.startsWith('01')) {
        normalized = '254' + normalized.substring(1);
    }
    // Add more rules if needed, e.g. for '7' or '1' directly
    if (normalized.length === 9 && (normalized.startsWith('7') || normalized.startsWith('1'))) {
        normalized = '254' + normalized;
    }
    // Basic validation for final format
    if (!/^254(7\d{8}|1\d{8})$/.test(normalized)) {
        throw new Error("Invalid Kenyan phone number format after normalization.");
    }
    return normalized;
};


export function PaymentHandler({
    amount, 
    userId,
    bookId,
    email,
    onSuccess,
    onError,
    currencyCodeForDisplay,
    amountInSelectedCurrency,
}: PaymentHandlerProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>();
    const [isProcessing, setIsProcessing] = useState(false); 
    const [isPreparingPayment, setIsPreparingPayment] = useState(false); 
    const [error, setError] = useState<string>();
    
    const [stripeClientSecret, setStripeClientSecret] = useState<string>();
    const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string>();

    const kenyaRegion = getRegionByCode('KE') || defaultRegion; // Get KES conversion rate
    const mpesaAmountKES = currencyCodeForDisplay === 'KES' 
        ? Math.round(amountInSelectedCurrency) // If already KES, use it (rounded)
        : Math.round(amount * kenyaRegion.conversionRateToUSD); // Convert USD base to KES

    const handlePaymentMethodSelect = async (method: PaymentMethod) => {
        setPaymentMethod(method);
        setError(undefined);
        setStripeClientSecret(undefined);
        setStripePaymentIntentId(undefined);

        if (method === 'stripe') {
            setIsPreparingPayment(true);
            try {
                const amountInCents = Math.round(amount * 100); 

                const response = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        method: 'stripe',
                        amount: amountInCents, 
                        currency: 'usd', 
                        userId,
                        bookId,
                        email
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Failed to initialize Stripe payment.");
                
                if (!data.clientSecret || !data.paymentId) {
                    throw new Error("Stripe client secret or Payment Intent ID missing from server response.");
                }
                setStripeClientSecret(data.clientSecret);
                setStripePaymentIntentId(data.paymentId);

            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to initialize Stripe payment. Please try a different method or refresh.';
                setError(message);
                onError(message); 
            } finally {
                setIsPreparingPayment(false);
            }
        }
    };

    const handleMpesaSubmit = async (rawPhoneNumber: string) => {
        setIsProcessing(true);
        setError(undefined);

        try {
            const normalizedPhoneNumber = normalizeKenyanPhoneNumber(rawPhoneNumber);

            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: 'mpesa',
                    amount: mpesaAmountKES, 
                    currency: 'KES',
                    userId,
                    bookId,
                    phoneNumber: normalizedPhoneNumber // Send normalized number
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "M-Pesa STK push failed.");
            
            onSuccess(data.paymentId, 'mpesa'); 
        } catch (err) {
            const message = err instanceof Error ? err.message : 'M-Pesa payment failed. Please check your number and try again.';
            setError(message);
            onError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMockPayment = async () => {
        setIsProcessing(true);
        setError(undefined);
        try {
             await new Promise(resolve => setTimeout(resolve, 1000)); 
            const mockPaymentId = `mock_${Date.now()}_${bookId}`;
            onSuccess(mockPaymentId, 'mock');
        } catch (err) {
             const message = err instanceof Error ? err.message : 'Mock payment failed.';
            setError(message);
            onError(message);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleStripeSuccess = () => {
        if (stripePaymentIntentId) {
            onSuccess(stripePaymentIntentId, 'stripe');
        } else {
            onError("Stripe payment completed, but Payment Intent ID is missing.");
        }
    };


    return (
        <div className="space-y-6">
            <PaymentSelector
                onSelect={handlePaymentMethodSelect}
                selectedMethod={paymentMethod}
                disabled={isPreparingPayment || isProcessing}
            />

            {isPreparingPayment && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Preparing payment options...</span>
                </div>
            )}

            {error && !isPreparingPayment && (
                <Alert variant="destructive">
                     <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Payment Setup Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="mt-6">
                {paymentMethod === 'stripe' && stripeClientSecret && !isPreparingPayment && (
                    <StripeForm
                        clientSecret={stripeClientSecret}
                        onSuccess={handleStripeSuccess}
                    />
                )}

                {paymentMethod === 'mpesa' && !isPreparingPayment && (
                    <MpesaForm
                        amount={mpesaAmountKES} 
                        onSubmit={handleMpesaSubmit}
                        isLoading={isProcessing}
                    />
                )}

                {paymentMethod === 'mock' && !isPreparingPayment && (
                    <Button
                        onClick={handleMockPayment}
                        className="w-full"
                        disabled={isProcessing}
                        size="lg"
                    >
                        {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Complete Mock Payment'}
                    </Button>
                )}
            </div>
        </div>
    );
}

