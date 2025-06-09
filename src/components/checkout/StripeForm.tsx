
"use client";

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: ReturnType<typeof loadStripe> | null = null;

if (stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
} else {
    console.error("Stripe Publishable Key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) is not set. Stripe payments will be unavailable.");
}

interface StripeFormProps {
    clientSecret: string;
    onSuccess: () => void; 
}

function StripeCheckoutForm({ onSuccess }: { onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string>();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) {
            setError("Stripe has not loaded correctly. Please refresh and try again.");
            return;
        }

        setIsProcessing(true);
        setError(undefined);

        try {
            // The return_url should point to a page that can handle the redirect
            // and extract status from query params, but for 'if_required' it's a fallback.
            const { error: submitError, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/checkout/payment?stripe_return=true`,
                },
                redirect: 'if_required', 
            });

            if (submitError) {
                if (submitError.type === "card_error" || submitError.type === "validation_error") {
                    setError(submitError.message);
                } else {
                    setError("An unexpected error occurred during payment. Please try again.");
                }
                 console.error("Stripe confirmPayment error:", submitError);
            } else {
                if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
                    // 'processing' means it might take a moment, webhook should confirm.
                    // For immediate UI feedback, we can treat 'processing' as on its way to success.
                    onSuccess();
                } else if (paymentIntent && paymentIntent.status === 'requires_payment_method') {
                     setError("Payment failed. Please try a different payment method or check your card details.");
                } else if (paymentIntent) {
                    // Other statuses like 'requires_action', 'canceled'
                    setError(`Payment status: ${paymentIntent.status}. Please follow any instructions or try again.`);
                }
                 else {
                    // This case implies a redirect might have been expected or an unknown issue.
                    // If redirect: 'if_required' leads here without error, it implies success if paymentIntent exists.
                    // If no paymentIntent, something is wrong.
                    console.warn("Stripe confirmPayment finished without explicit success/failure or error object. Assuming success for now, webhook will confirm.");
                    onSuccess(); // Optimistic call
                }
            }
        } catch (err) {
            console.error("Stripe form submission error:", err);
            setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement 
                id="payment-element" 
                options={{
                    layout: {
                        type: 'tabs', // 'tabs' or 'accordion'
                        defaultCollapsed: false,
                    }
                }} 
            />
            {error && (
                <Alert variant="destructive" className="mt-4 text-xs sm:text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Payment Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full mt-4 sm:mt-6 text-sm sm:text-base py-2.5 sm:py-3"
            >
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Pay with Card'}
            </Button>
        </form>
    );
}

export function StripeForm({ clientSecret, onSuccess }: StripeFormProps) {
    if (!stripePublishableKey || !stripePromise) {
        return (
            <Alert variant="destructive" className="text-xs sm:text-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Stripe Configuration Error</AlertTitle>
                <AlertDescription>
                    Stripe is not configured correctly. Card payments are unavailable.
                    { !stripePublishableKey && " (Missing Publishable Key)"}
                    { !stripePromise && stripePublishableKey && " (Failed to load Stripe.js)"}
                </AlertDescription>
            </Alert>
        );
    }
    

    return (
        <Card className="p-4 sm:p-6">
            <Elements
                stripe={stripePromise}
                options={{
                    clientSecret,
                    appearance: {
                        theme: 'stripe', 
                        labels: 'floating',
                        variables: {
                            colorPrimary: '#4B0082', // Deep Indigo from your theme
                        }
                    },
                }}
            >
                <StripeCheckoutForm onSuccess={onSuccess} />
            </Elements>
        </Card>
    );
}
