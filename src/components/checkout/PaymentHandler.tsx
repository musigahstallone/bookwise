
"use client";

import { useState } from 'react';
import { PaymentSelector } from '@/components/checkout/PaymentSelector';
import { MpesaForm } from '@/components/checkout/MpesaForm';
import { StripeForm } from '@/components/checkout/StripeForm';
import { type PaymentMethod, type PaymentDetails } from '@/lib/payment-service'; // Ensure PaymentDetails is imported
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getRegionByCode, defaultRegion } from '@/data/regionData';
import type { OrderItemInput } from '@/lib/actions/trackingActions';


interface PaymentHandlerProps {
    amount: number; // Base amount in USD
    userId: string;
    items: OrderItemInput[]; // Changed from bookId to items
    email?: string;
    onSuccess: (paymentId: string, method: PaymentMethod, message?: string) => void; // Added message for M-Pesa
    onError: (error: string) => void;
    currencyCodeForDisplay: string;
    amountInSelectedCurrency: number;
    regionCode: string; // Added for PaymentDetails
    itemCount: number; // Added for PaymentDetails
}

const normalizeKenyanPhoneNumber = (phoneNumber: string): string => {
    let normalized = phoneNumber.trim().replace(/\s+/g, ''); // Remove all spaces
    if (normalized.startsWith('+254')) {
        normalized = normalized.substring(1); 
    }
    if (normalized.startsWith('07')) {
        normalized = '254' + normalized.substring(1);
    } else if (normalized.startsWith('01')) { // For newer 01 numbers
        normalized = '254' + normalized.substring(1);
    }
    if (normalized.length === 9 && (normalized.startsWith('7') || normalized.startsWith('1'))) { // For numbers like 712345678
        normalized = '254' + normalized;
    }
    if (!/^254(7\d{8}|1\d{8})$/.test(normalized)) {
        console.warn(`Original phone: ${phoneNumber}, Normalized attempt: ${normalized}. Failed regex ^254(7\\d{8}|1\\d{8})$`);
        throw new Error("Invalid Kenyan phone number format after normalization. Expected 254XXXXXXXXX.");
    }
    return normalized;
};


export function PaymentHandler({
    amount,
    userId,
    items, // Use items
    email,
    onSuccess,
    onError,
    currencyCodeForDisplay,
    amountInSelectedCurrency,
    regionCode, // Use regionCode
    itemCount, // Use itemCount
}: PaymentHandlerProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPreparingPayment, setIsPreparingPayment] = useState(false);
    const [error, setError] = useState<string>();

    const [stripeClientSecret, setStripeClientSecret] = useState<string>();
    const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string>();

    const kenyaRegion = getRegionByCode('KE') || defaultRegion;
    const mpesaAmountKES = currencyCodeForDisplay === 'KES'
        ? Math.round(amountInSelectedCurrency)
        : Math.round(amount * kenyaRegion.conversionRateToUSD);

    const handlePaymentMethodSelect = async (method: PaymentMethod) => {
        setPaymentMethod(method);
        setError(undefined);
        setStripeClientSecret(undefined);
        setStripePaymentIntentId(undefined);

        if (method === 'stripe') {
            setIsPreparingPayment(true);
            try {
                const amountInCents = Math.round(amount * 100);

                const paymentDetailsForApi: Omit<PaymentDetails, 'phoneNumber'> = {
                    method: 'stripe',
                    amount: amountInCents,
                    currency: 'usd', // Stripe typically uses base currency like USD
                    userId,
                    items,
                    email,
                    regionCode,
                    itemCount,
                };

                const response = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paymentDetailsForApi)
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

            const paymentDetailsForApi: PaymentDetails = {
                method: 'mpesa',
                amount: mpesaAmountKES,
                currency: 'KES',
                userId,
                items,
                phoneNumber: normalizedPhoneNumber,
                email,
                regionCode,
                itemCount,
            };

            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentDetailsForApi)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "M-Pesa STK push failed.");
            
            // Pass message for M-Pesa from response if available
            onSuccess(data.paymentId, 'mpesa', data.message);
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
            const paymentDetailsForApi: PaymentDetails = {
                method: 'mock',
                amount: amountInSelectedCurrency, // Use the display currency amount for mock
                currency: currencyCodeForDisplay,
                userId,
                items,
                email,
                regionCode,
                itemCount,
            };
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentDetailsForApi)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Mock payment failed at API.");

            onSuccess(data.paymentId, 'mock');
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
            const msg = "Stripe payment completed, but Payment Intent ID is missing.";
            setError(msg);
            onError(msg);
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
