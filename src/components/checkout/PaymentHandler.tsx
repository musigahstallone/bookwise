import { useEffect, useState } from 'react';
import { PaymentSelector } from '@/components/checkout/PaymentSelector';
import { MpesaForm } from '@/components/checkout/MpesaForm';
import { StripeForm } from '@/components/checkout/StripeForm';
import { PaymentMethod } from '@/lib/payment-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PaymentHandlerProps {
    amount: number;
    userId: string;
    bookId: string;
    email?: string;
    onSuccess: (paymentId: string) => void;
    onError: (error: string) => void;
}

export function PaymentHandler({
    amount,
    userId,
    bookId,
    email,
    onSuccess,
    onError,
}: PaymentHandlerProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string>();
    const [stripeClientSecret, setStripeClientSecret] = useState<string>();

    const handlePaymentMethodSelect = async (method: PaymentMethod) => {
        setPaymentMethod(method);
        setError(undefined);

        if (method === 'stripe') {
            try {
                const response = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        method: 'stripe',
                        amount: amount * 100, // Convert to cents
                        currency: 'usd',
                        userId,
                        bookId,
                        email
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setStripeClientSecret(data.clientSecret);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to initialize payment';
                setError(message);
                onError(message);
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
                    amount,
                    currency: 'KES',
                    userId,
                    bookId,
                    phoneNumber
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            onSuccess(data.paymentId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Payment failed';
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
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: 'mock',
                    amount,
                    currency: 'USD',
                    userId,
                    bookId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            onSuccess(data.paymentId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Payment failed';
            setError(message);
            onError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <PaymentSelector
                onSelect={handlePaymentMethodSelect}
                selectedMethod={paymentMethod}
            />

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="mt-6">
                {paymentMethod === 'stripe' && stripeClientSecret && (
                    <StripeForm
                        clientSecret={stripeClientSecret}
                        onSuccess={() => onSuccess(stripeClientSecret)}
                    />
                )}

                {paymentMethod === 'mpesa' && (
                    <MpesaForm
                        amount={amount}
                        onSubmit={handleMpesaSubmit}
                        isLoading={isProcessing}
                    />
                )}

                {paymentMethod === 'mock' && (
                    <Button
                        onClick={handleMockPayment}
                        className="w-full"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : 'Complete Mock Payment'}
                    </Button>
                )}
            </div>
        </div>
    );
}
