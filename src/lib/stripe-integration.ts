import StripeOriginal from "stripe";

// Use StripeOriginal for types and API usage
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
  paymentIntent: StripeOriginal.PaymentIntent; // ✅ Use StripeOriginal here
}

// 1. Initialize Stripe client
export function getStripeClient(config: StripeConfig): StripeOriginal {
  return new StripeOriginal(config.secretKey, {
    apiVersion: (config.apiVersion || "2024-06-20") as any,
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
  });
  if (!paymentIntent.client_secret) {
    throw new Error("Stripe PaymentIntent client_secret is missing.");
  }
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    paymentIntent: paymentIntent,
  };
}

// 3. (Optional) Verify Stripe Webhook Signature
export function verifyStripeWebhookSignature(
  payload: Buffer | string,
  sigHeader: string,
  config: StripeConfig
): StripeOriginal.Event | null {
  if (!config.webhookSecret) {
    console.warn("Stripe webhook secret is not configured. Signature verification skipped.");
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
