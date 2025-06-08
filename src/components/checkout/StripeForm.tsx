import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setError(undefined);

        try {
            const { error: submitError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/purchase-success`,
                },
                redirect: 'if_required',
            });

            if (submitError) {
                setError(submitError.message);
            } else {
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            {error && (
                <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full mt-4"
            >
                {isProcessing ? 'Processing...' : 'Pay Now'}
            </Button>
        </form>
    );
}

export function StripeForm({ clientSecret, onSuccess }: StripeFormProps) {
    return (
        <Card className="p-6">
            <Elements
                stripe={stripePromise}
                options={{
                    clientSecret,
                    appearance: {
                        theme: 'stripe',
                    },
                }}
            >
                <StripeCheckoutForm onSuccess={onSuccess} />
            </Elements>
        </Card>
    );
}
