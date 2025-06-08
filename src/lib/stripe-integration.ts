// Stripe Integration Logic
// This module provides functions to create a payment intent and handle Stripe payments.
// You can later import and use these functions in your API routes or server actions.

import Stripe from "stripe";

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
}

// 1. Initialize Stripe client
export function getStripeClient(config: StripeConfig): Stripe {
  return new Stripe(config.secretKey, {
    apiVersion: (config.apiVersion || "2025-05-28.basil") as "2025-05-28.basil",
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
    // You can add more options as needed
  });
  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

// 3. (Optional) Verify Stripe Webhook Signature
export function verifyStripeWebhookSignature(
  payload: Buffer | string,
  sigHeader: string,
  config: StripeConfig
): Stripe.Event | null {
  if (!config.webhookSecret) return null;
  const stripe = getStripeClient(config);
  try {
    return stripe.webhooks.constructEvent(
      payload,
      sigHeader,
      config.webhookSecret
    );
  } catch (err) {
    return null;
  }
}

// Example usage (not to be run directly, just for reference):
// const config: StripeConfig = {
//   secretKey: process.env.STRIPE_SECRET_KEY!,
//   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // optional
// };
// const payment = await createStripePaymentIntent(config, {
//   amount: 1000, // e.g., 1000 KES = 1000 (if currency is KES)
//   currency: 'kes',
//   metadata: { orderId: '123' },
//   receipt_email: 'user@example.com',
// });
// payment.clientSecret // send to frontend for Stripe.js
