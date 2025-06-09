
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyStripeWebhookSignature, getStripeClient } from "@/lib/stripe-integration";
import { 
  updateTransactionAndCreateOrderIfNeeded, // For M-Pesa, this updates transaction and then order
  finalizeStripeTransactionAndCreateOrder, // For Stripe, this updates transaction and then order
  type MpesaStkCallback
} from "@/lib/payment-service";
import type Stripe from "stripe";


interface MpesaCallbackPayload {
  Body: {
    stkCallback: MpesaStkCallback;
  };
}


export async function POST(request: Request) {
  const headersList = headers(); 
  const paymentProvider = headersList.get("x-payment-provider") || headersList.get("X-Payment-Provider") || "unknown";

  const rawBodyForLogging = await request.clone().text();
  console.log(`Webhook received for provider: ${paymentProvider}. Raw Body (first 500 chars): ${rawBodyForLogging.substring(0,500)}`);


  try {
    if (paymentProvider === "stripe") {
      const bodyText = await request.text();
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
          const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
          console.log(`Stripe Webhook: PaymentIntent ${paymentIntentSucceeded.id} succeeded.`);
          await finalizeStripeTransactionAndCreateOrder(paymentIntentSucceeded.id, paymentIntentSucceeded);
          break;
        case "payment_intent.payment_failed":
          const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
          console.log(`Stripe Webhook: PaymentIntent ${paymentIntentFailed.id} failed. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
          await finalizeStripeTransactionAndCreateOrder(paymentIntentFailed.id, paymentIntentFailed);
          break;
        default:
          console.log(`Stripe Webhook: Unhandled event type ${event.type}`);
      }
      return NextResponse.json({ received: true, event: event.type });

    } else if (paymentProvider === "mpesa") {
      const mpesaCallbackPayload: MpesaCallbackPayload = JSON.parse(rawBodyForLogging); 
      console.log("Parsed M-Pesa Callback Payload:", JSON.stringify(mpesaCallbackPayload, null, 2));

      if (!mpesaCallbackPayload.Body || !mpesaCallbackPayload.Body.stkCallback) {
        console.error("M-Pesa webhook: Invalid callback structure received.");
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback structure received." }, { status: 400 });
      }

      const { stkCallback } = mpesaCallbackPayload.Body;
      const { CheckoutRequestID } = stkCallback;
      
      console.log(`M-Pesa Webhook: Processing callback for CheckoutRequestID ${CheckoutRequestID}, ResultCode: ${stkCallback.ResultCode}`);

      // This function now updates the transaction and then updates the corresponding order status
      await updateTransactionAndCreateOrderIfNeeded(CheckoutRequestID, stkCallback); 
      
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received successfully." });

    } else {
      // Try to infer provider
      try {
         const parsedBody = JSON.parse(rawBodyForLogging);
         if (parsedBody.Body && parsedBody.Body.stkCallback) {
            console.warn("Webhook: Payment provider header missing, inferred M-Pesa.");
            const mpesaCallbackPl: MpesaCallbackPayload = parsedBody;
            const { stkCallback } = mpesaCallbackPl.Body;
            await updateTransactionAndCreateOrderIfNeeded(stkCallback.CheckoutRequestID, stkCallback);
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received successfully (inferred M-Pesa)." });
         } else if (parsedBody.type && typeof parsedBody.type === 'string' && parsedBody.type.startsWith('payment_intent.')) {
            console.warn("Webhook: Payment provider header missing, inferred Stripe.");
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
    if (rawBodyForLogging.includes("stkCallback") && rawBodyForLogging.includes("Body")) { 
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Webhook processing failed internally due to an error." }, { status: 500 });
    }
    return NextResponse.json({ error: "Webhook processing failed: " + error.message }, { status: 500 });
  }
}


    