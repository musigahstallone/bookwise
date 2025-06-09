
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyStripeWebhookSignature, getStripeClient } from "@/lib/stripe-integration"; // getStripeClient for direct intent retrieval
import { updateTransactionAndCreateOrderIfNeeded, finalizeStripeTransactionAndCreateOrder } from "@/lib/payment-service";

interface MpesaStkCallbackItem {
  Name: string;
  Value: string | number;
}
interface MpesaStkCallbackResult {
  ResultCode: number; 
  ResultDesc: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  CallbackMetadata?: {
    Item: MpesaStkCallbackItem[];
  };
}
interface MpesaStkCallbackBody {
  stkCallback: MpesaStkCallbackResult;
}
interface MpesaCallbackPayload {
  Body: MpesaStkCallbackBody;
}


export async function POST(request: Request) {
  const headersList = headers(); 
  const paymentProvider = headersList.get("x-payment-provider") || headersList.get("X-Payment-Provider") || "unknown";

  const rawBodyForLogging = await request.clone().text();
  console.log(`Webhook received for provider: ${paymentProvider}. Raw Body: ${rawBodyForLogging}`);


  try {
    if (paymentProvider === "stripe") {
      const bodyText = await request.text(); // Use text() for Stripe as per their docs
      const signature = headersList.get("stripe-signature");

      if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
        console.error("Stripe webhook: Missing signature or secrets.");
        return NextResponse.json({ error: "Webhook configuration error for Stripe." }, { status: 400 });
      }

      const event = verifyStripeWebhookSignature(bodyText, signature, {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      });

      if (!event) {
        console.error("Stripe webhook: Invalid signature.");
        return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
      }

      console.log(`Stripe Webhook: Received event type ${event.type}`);

      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntentSucceeded = event.data.object;
          console.log(`Stripe Webhook: PaymentIntent ${paymentIntentSucceeded.id} succeeded.`);
          // Call a function to update transaction and create order
          await finalizeStripeTransactionAndCreateOrder(paymentIntentSucceeded.id, paymentIntentSucceeded);
          break;
        case "payment_intent.payment_failed":
          const paymentIntentFailed = event.data.object;
          console.log(`Stripe Webhook: PaymentIntent ${paymentIntentFailed.id} failed. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
          // Update transaction to failed, no order created
          await updateTransactionAndCreateOrderIfNeeded(paymentIntentFailed.id, "failed", { stripeEvent: event.type, error: paymentIntentFailed.last_payment_error });
          break;
        // Add other Stripe event types as needed (e.g., payment_intent.processing, payment_intent.canceled)
        default:
          console.log(`Stripe Webhook: Unhandled event type ${event.type}`);
      }
      return NextResponse.json({ received: true, event: event.type });

    } else if (paymentProvider === "mpesa") {
      const mpesaCallback: MpesaCallbackPayload = JSON.parse(rawBodyForLogging); // Use the already cloned body
      console.log("Parsed M-Pesa Callback:", JSON.stringify(mpesaCallback, null, 2));

      if (!mpesaCallback.Body || !mpesaCallback.Body.stkCallback) {
        console.error("M-Pesa webhook: Invalid callback structure received.");
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback structure received." }, { status: 400 });
      }

      const { stkCallback } = mpesaCallback.Body;
      const { CheckoutRequestID, ResultCode } = stkCallback;
      
      console.log(`M-Pesa Webhook: Processing callback for CheckoutRequestID ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

      await updateTransactionAndCreateOrderIfNeeded(
        CheckoutRequestID,
        ResultCode === 0 ? "completed" : "failed",
        stkCallback // Pass the whole stkCallback object as metadata
      );
      
      // Acknowledge Safaricom
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received successfully." });

    } else {
      // If provider is unknown or not set, try to infer based on body structure (basic attempt)
      try {
         const parsedBody = JSON.parse(rawBodyForLogging);
         if (parsedBody.Body && parsedBody.Body.stkCallback) { // Looks like M-Pesa
            console.warn("Webhook: Payment provider header missing, but body looks like M-Pesa. Processing as M-Pesa.");
            const mpesaCallback: MpesaCallbackPayload = parsedBody;
            const { stkCallback } = mpesaCallback.Body;
            const { CheckoutRequestID, ResultCode } = stkCallback;
             await updateTransactionAndCreateOrderIfNeeded(
                CheckoutRequestID,
                ResultCode === 0 ? "completed" : "failed",
                stkCallback
            );
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received successfully (inferred M-Pesa)." });
         } else if (parsedBody.type && parsedBody.type.startsWith('payment_intent.')) { // Looks like Stripe
            console.warn("Webhook: Payment provider header missing, but body looks like Stripe. Processing as Stripe.");
            // Re-verify signature if possible, or log & proceed cautiously if header was genuinely missed by sender
            // For now, if header is missing, we can't verify Stripe signature robustly.
            // This path is risky without the stripe-signature header.
            console.error("Stripe webhook inferred, but 'stripe-signature' header is missing. Cannot process securely.");
            return NextResponse.json({ error: "Inferred Stripe event, but signature missing." }, { status: 400 });
         }
      } catch (parseError) {
        // Not JSON or not a recognized structure
      }
      console.warn(`Webhook: Unknown or missing payment provider: ${paymentProvider}. Body: ${rawBodyForLogging.substring(0,200)}...`);
      return NextResponse.json({ error: "Unknown payment provider or malformed request." }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    if (paymentProvider === "mpesa" || (rawBodyForLogging.includes("stkCallback") && rawBodyForLogging.includes("Body")) ) { // Check if it might be an M-Pesa error
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Webhook processing failed internally." }, { status: 500 });
    }
    return NextResponse.json({ error: "Webhook processing failed: " + error.message }, { status: 500 });
  }
}
