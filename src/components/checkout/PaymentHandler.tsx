
"use client";

import { useState } from 'react';
import { PaymentSelector } from '@/components/checkout/PaymentSelector';
import { MpesaForm } from '@/components/checkout/MpesaForm';
import { StripeForm } from '@/components/checkout/StripeForm';
import { type PaymentMethod, type PaymentDetails } from '@/lib/payment-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getRegionByCode, defaultRegion } from '@/data/regionData';
import type { OrderItemInput } from '@/lib/actions/trackingActions';


interface PaymentHandlerProps {
    amountUSD: number; // Base amount in USD, always
    userId: string;
    items: OrderItemInput[];
    email?: string;
    onSuccess: (orderId: string, paymentGatewayId: string, method: PaymentMethod, message?: string) => void;
    onError: (error: string, orderId?: string) => void;
    regionCode: string; // For display and determining payment currency if applicable
    itemCount: number;
}

const normalizeKenyanPhoneNumber = (phoneNumber: string): string => {
    let normalized = phoneNumber.trim().replace(/\s+/g, '');
    if (normalized.startsWith('+254')) {
        normalized = normalized.substring(1); 
    }
    if (normalized.startsWith('07')) {
        normalized = '254' + normalized.substring(1);
    } else if (normalized.startsWith('01')) {
        normalized = '254' + normalized.substring(1);
    }
    if (normalized.length === 9 && (normalized.startsWith('7') || normalized.startsWith('1'))) {
        normalized = '254' + normalized;
    }
    if (!/^254(7\d{8}|1\d{8})$/.test(normalized)) {
        console.warn(`Original phone: ${phoneNumber}, Normalized attempt: ${normalized}. Failed regex ^254(7\\d{8}|1\\d{8})$`);
        throw new Error("Invalid Kenyan phone number format after normalization. Expected 254XXXXXXXXX.");
    }
    return normalized;
};


export function PaymentHandler({
    amountUSD, // This is always the base USD amount
    userId,
    items,
    email,
    onSuccess,
    onError,
    regionCode,
    itemCount,
}: PaymentHandlerProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>();
    const [isProcessing, setIsProcessing] = useState(false); // For actual payment submission (Mpesa STK, Mock)
    const [isPreparing, setIsPreparing] = useState(false); // For fetching Stripe client secret
    const [error, setError] = useState<string>();
    const [currentOrderId, setCurrentOrderId] = useState<string | undefined>();

    const [stripeClientSecret, setStripeClientSecret] = useState<string>();
    const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string>();


    const selectedDisplayRegion = getRegionByCode(regionCode) || defaultRegion;
    const amountInSelectedCurrency = amountUSD * selectedDisplayRegion.conversionRateToUSD;
    
    let mpesaAmountKES = amountInSelectedCurrency; // If selected currency is KES
    if (selectedDisplayRegion.currencyCode !== 'KES') {
        const kenyaRegion = getRegionByCode('KE') || defaultRegion; // Fallback needed
        mpesaAmountKES = amountUSD * kenyaRegion.conversionRateToUSD;
    }
    mpesaAmountKES = Math.round(mpesaAmountKES); // Mpesa needs whole numbers

    const handlePaymentMethodSelect = async (method: PaymentMethod) => {
        setPaymentMethod(method);
        setError(undefined);
        setStripeClientSecret(undefined);
        setStripePaymentIntentId(undefined);
        // currentOrderId is set by processApiPaymentCall which is called by specific handlers

        // For Stripe, we need to create PaymentIntent (and pending order) immediately
        if (method === 'stripe') {
            await processApiPaymentCall(method);
        }
    };
    
    // Generic function to call the /api/payment endpoint
    const processApiPaymentCall = async (method: PaymentMethod, phoneNumberForMpesa?: string) => {
        setIsPreparing(true); // Used for Stripe client secret fetching and initial Mpesa/Mock call
        setIsProcessing(method !== 'stripe'); // For Stripe, processing happens after user enters card
        setError(undefined);

        let apiAmount = 0;
        let apiCurrency = "";

        if (method === 'stripe') {
            apiAmount = Math.round(amountUSD * 100); // Stripe needs cents
            apiCurrency = 'usd';
        } else if (method === 'mpesa') {
            apiAmount = mpesaAmountKES; // Already calculated and rounded KES amount
            apiCurrency = 'KES';
        } else if (method === 'mock') {
            apiAmount = selectedDisplayRegion.currencyCode === 'KES' ? Math.round(amountInSelectedCurrency) : parseFloat(amountInSelectedCurrency.toFixed(2));
            apiCurrency = selectedDisplayRegion.currencyCode;
        }

        const paymentDetailsForApi: Omit<PaymentDetails, 'phoneNumber'> & { phoneNumber?: string } = {
            method: method,
            amount: apiAmount,
            currency: apiCurrency,
            userId,
            items,
            email,
            regionCode,
            itemCount,
            actualAmountInSelectedCurrency: selectedDisplayRegion.currencyCode === 'KES' ? Math.round(amountInSelectedCurrency) : parseFloat(amountInSelectedCurrency.toFixed(2)),
        };
        if (method === 'mpesa' && phoneNumberForMpesa) {
            paymentDetailsForApi.phoneNumber = phoneNumberForMpesa;
        }

        console.log("PaymentHandler: Preparing to call /api/payment with details:", paymentDetailsForApi);

        try {
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentDetailsForApi)
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to process payment for method ${method}.`);
            }

            setCurrentOrderId(data.orderId); // Store the orderId from the response

            if (method === 'stripe') {
                if (!data.clientSecret || !data.paymentGatewayId) {
                    throw new Error("Stripe client secret or Payment Intent ID missing.");
                }
                setStripeClientSecret(data.clientSecret);
                setStripePaymentIntentId(data.paymentGatewayId);
            } else if (method === 'mpesa') {
                // Mpesa STK push initiated, success message is in data.message
                onSuccess(data.orderId, data.paymentGatewayId, method, data.message);
            } else if (method === 'mock') {
                // Mock payment successful immediately
                onSuccess(data.orderId, data.paymentGatewayId, method, data.message);
            }

        } catch (err) {
            const message = err instanceof Error ? err.message : `Payment processing for ${method} failed.`;
            setError(message);
            onError(message, currentOrderId); // Pass currentOrderId if available
        } finally {
            setIsPreparing(false);
            if (method !== 'stripe') setIsProcessing(false); // Stripe processing is separate
        }
    };


    const handleMpesaSubmit = async (rawPhoneNumber: string) => {
        const normalizedPhoneNumber = normalizeKenyanPhoneNumber(rawPhoneNumber);
        await processApiPaymentCall('mpesa', normalizedPhoneNumber);
    };

    const handleMockPayment = async () => {
        await processApiPaymentCall('mock');
    };
    
    const handleStripeSuccess = () => { // Called by StripeForm on successful card entry
        if (stripePaymentIntentId && currentOrderId) {
            onSuccess(currentOrderId, stripePaymentIntentId, 'stripe', "Stripe payment submitted for processing.");
        } else {
            const msg = "Stripe payment successful, but Payment Intent ID or Order ID is missing.";
            setError(msg);
            onError(msg, currentOrderId);
        }
    };


    return (
        <div className="space-y-6">
            <PaymentSelector
                onSelect={handlePaymentMethodSelect}
                selectedMethod={paymentMethod}
                disabled={isPreparing || isProcessing}
            />

            {(isPreparing || (paymentMethod === 'stripe' && !stripeClientSecret && !error)) && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Preparing payment...</span>
                </div>
            )}

            {error && !isPreparing && (
                <Alert variant="destructive">
                     <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Payment Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="mt-6">
                {paymentMethod === 'stripe' && stripeClientSecret && !isPreparing && !error && (
                    <StripeForm
                        clientSecret={stripeClientSecret}
                        onSuccess={handleStripeSuccess} // StripeForm itself handles its processing state
                    />
                )}

                {paymentMethod === 'mpesa' && !isPreparing && !error && (
                    <MpesaForm
                        amount={mpesaAmountKES} // Display KES amount
                        onSubmit={handleMpesaSubmit}
                        isLoading={isProcessing} // Mpesa processing happens on submit here
                    />
                )}

                {paymentMethod === 'mock' && !isPreparing && !error && (
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


    