
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

// Conditionally load Stripe
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: ReturnType<typeof loadStripe> | null = null;

if (stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
}

interface StripeFormProps {
    clientSecret: string;
    onSuccess: () => void; // onSuccess now doesn't need to pass paymentId, it's handled by parent
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
            const { error: submitError, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    // Make sure to change this to your payment completion page
                    return_url: `${window.location.origin}/checkout/payment?status=success`, // or a dedicated success page
                },
                redirect: 'if_required', // Important: handle redirect or success/failure here
            });

            if (submitError) {
                if (submitError.type === "card_error" || submitError.type === "validation_error") {
                    setError(submitError.message);
                } else {
                    setError("An unexpected error occurred during payment. Please try again.");
                }
            } else {
                // If redirect: 'if_required', paymentIntent will be available if successful
                if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
                    onSuccess();
                } else if (paymentIntent && paymentIntent.status === 'requires_payment_method') {
                     setError("Payment failed. Please try a different payment method.");
                } else if (!paymentIntent) {
                    // This case might occur if redirect happened and user came back
                    // or if payment is still processing and needs a webhook to confirm.
                    // For now, assume success if no immediate error & no redirect, but ideally webhook handles final state.
                    onSuccess(); // Optimistically call onSuccess, webhook should be source of truth
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement id="payment-element" options={{layout: "tabs"}} />
            {error && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Payment Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full mt-6"
            >
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Pay Now'}
            </Button>
        </form>
    );
}

export function StripeForm({ clientSecret, onSuccess }: StripeFormProps) {
    if (!stripePublishableKey) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Stripe Configuration Error</AlertTitle>
                <AlertDescription>
                    The Stripe publishable key is not configured. Card payments are currently unavailable.
                    Please contact support or ensure <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> is set in the environment variables.
                </AlertDescription>
            </Alert>
        );
    }
    
    if (!stripePromise) {
         return ( // Should not happen if stripePublishableKey is set, but as a fallback
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Stripe Initialization Error</AlertTitle>
                <AlertDescription>
                    Could not initialize Stripe. Please refresh the page or try again later.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="p-6">
            <Elements
                stripe={stripePromise}
                options={{
                    clientSecret,
                    appearance: {
                        theme: 'stripe', // or 'night', 'flat', etc.
                        labels: 'floating',
                    },
                }}
            >
                <StripeCheckoutForm onSuccess={onSuccess} />
            </Elements>
        </Card>
    );
}
