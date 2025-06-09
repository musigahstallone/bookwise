
"use client";

import { useEffect, useState } from 'react';
import { PaymentSelector } from '@/components/checkout/PaymentSelector';
import { MpesaForm } from '@/components/checkout/MpesaForm';
import { StripeForm } from '@/components/checkout/StripeForm';
import { type PaymentMethod } from '@/lib/payment-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PaymentHandlerProps {
    amount: number; // Base amount in USD for Stripe, KES for M-Pesa
    userId: string;
    bookId: string; // Assuming single book purchase for simplicity in this example
    email?: string;
    onSuccess: (paymentId: string, method: PaymentMethod) => void; // Pass method back
    onError: (error: string) => void;
    currencyCodeForDisplay: string; // e.g. "USD", "KES" for display on card
    amountInSelectedCurrency: number; // Amount in the currency selected by user (USD, EUR, KES)
}

export function PaymentHandler({
    amount, // This should be USD amount for Stripe logic
    userId,
    bookId,
    email,
    onSuccess,
    onError,
    currencyCodeForDisplay,
    amountInSelectedCurrency,
}: PaymentHandlerProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>();
    const [isProcessing, setIsProcessing] = useState(false); // General processing state
    const [isPreparingPayment, setIsPreparingPayment] = useState(false); // For API calls before form display
    const [error, setError] = useState<string>();
    
    // Stripe specific state
    const [stripeClientSecret, setStripeClientSecret] = useState<string>();
    const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string>();

    // M-Pesa specific state (amount will be converted if needed)
    const mpesaAmountKES = currencyCodeForDisplay === 'KES' ? amountInSelectedCurrency : Math.round(amount * 130.50); // Example: use actual KES amount if pre-calculated, else convert USD

    const handlePaymentMethodSelect = async (method: PaymentMethod) => {
        setPaymentMethod(method);
        setError(undefined);
        setStripeClientSecret(undefined);
        setStripePaymentIntentId(undefined);

        if (method === 'stripe') {
            setIsPreparingPayment(true);
            try {
                // Amount for Stripe should be in cents
                const amountInCents = Math.round(amount * 100); 

                const response = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        method: 'stripe',
                        amount: amountInCents, // Send amount in cents
                        currency: 'usd', // Stripe charges in USD for this setup
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
                onError(message); // Notify parent
            } finally {
                setIsPreparingPayment(false);
            }
        }
    };

    const handleMpesaSubmit = async (phoneNumber: string) => {
        setIsProcessing(true);
        setError(undefined);

        try {
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: 'mpesa',
                    amount: mpesaAmountKES, // Send KES amount
                    currency: 'KES',
                    userId,
                    bookId,
                    phoneNumber
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "M-Pesa STK push failed.");
            // For M-Pesa, success here means STK push initiated. Actual confirmation via webhook.
            // For mock flow, we assume success and proceed.
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
            // In a real scenario, you might still hit an API endpoint for mock
             await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
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
            // This case should ideally not happen if clientSecret was set
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
                        amount={mpesaAmountKES} // Display KES amount
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
