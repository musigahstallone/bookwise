
// Stripe Integration Logic
// This module provides functions to create a payment intent and handle Stripe payments.

import StripeOriginal from "stripe"; // Import original Stripe

// Re-export Stripe types if needed elsewhere, or use StripeOriginal.PaymentIntent etc.
export type Stripe = StripeOriginal;
export type StripePaymentIntent = StripeOriginal.PaymentIntent;


export interface StripeConfig {
  secretKey: string;
  webhookSecret?: string;
  apiVersion?: string;
}

export interface CreatePaymentIntentParams {
  amount: number; // in the smallest currency unit (e.g., cents for USD, kobo for NGN)
  currency: string; // e.g., 'usd', 'kes'
  metadata?: Record<string, string>;
  receipt_email?: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  paymentIntent: Stripe.PaymentIntent; // Return the full PaymentIntent object
}

// 1. Initialize Stripe client
export function getStripeClient(config: StripeConfig): Stripe {
  return new StripeOriginal(config.secretKey, {
    apiVersion: (config.apiVersion || "2024-06-20") as any, // Use latest or your preferred version
  });
}

// 2. Create a Payment Intent
export async function createStripePaymentIntent(
  config: StripeConfig,
  params: CreatePaymentIntentParams
): Promise<PaymentIntentResult> {
  const stripe = getStripeClient(config);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency,
    metadata: params.metadata,
    receipt_email: params.receipt_email,
    // You can add more options as needed, e.g., payment_method_types
  });
  if (!paymentIntent.client_secret) {
    throw new Error("Stripe PaymentIntent client_secret is missing.");
  }
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    paymentIntent: paymentIntent, // Return the full object
  };
}

// 3. (Optional) Verify Stripe Webhook Signature
export function verifyStripeWebhookSignature(
  payload: Buffer | string,
  sigHeader: string,
  config: StripeConfig
): Stripe.Event | null {
  if (!config.webhookSecret) {
      console.warn("Stripe webhook secret is not configured. Signature verification skipped.");
      // Depending on security policy, you might want to throw an error or handle differently
      // For now, returning null to indicate verification couldn't be performed.
      return null; 
    }
  const stripe = getStripeClient(config);
  try {
    return stripe.webhooks.constructEvent(
      payload,
      sigHeader,
      config.webhookSecret
    );
  } catch (err: any) {
    console.error("Error verifying Stripe webhook signature:", err.message);
    return null;
  }
}
