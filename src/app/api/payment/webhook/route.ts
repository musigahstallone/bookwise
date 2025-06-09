
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
  const headersList = await headers(); 
  const paymentProvider = headersList.get("x-payment-provider") || headersList.get("X-Payment-Provider") || "unknown";

  let rawBodyForLogging: string;
  try {
    rawBodyForLogging = await request.clone().text(); // Clone to read body multiple times if needed
    console.log(`\n--- Webhook Received ---`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Provider Header: ${paymentProvider}`);
    console.log(`Raw Body (first 500 chars): ${rawBodyForLogging.substring(0,500)}`);
  } catch (cloneError) {
    console.error("Webhook: Error cloning request to get raw body:", cloneError);
    return NextResponse.json({ error: "Internal server error reading request body." }, { status: 500 });
  }


  try {
    if (paymentProvider === "stripe") {
      console.log("Stripe Webhook: Identified Stripe as provider.");
      const signature = headersList.get("stripe-signature");

      if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
        console.error("Stripe webhook: Missing signature or secrets. STRIPE_WEBHOOK_SECRET configured:", !!process.env.STRIPE_WEBHOOK_SECRET, "STRIPE_SECRET_KEY configured:", !!process.env.STRIPE_SECRET_KEY);
        return NextResponse.json({ error: "Webhook configuration error for Stripe." }, { status: 400 });
      }
      
      let event: Stripe.Event;
      try {
        event = verifyStripeWebhookSignature(rawBodyForLogging, signature, { // Use rawBodyForLogging
          secretKey: process.env.STRIPE_SECRET_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        });
      } catch (verificationError: any) {
        console.error("Stripe Webhook: Signature verification failed:", verificationError.message);
        return NextResponse.json({ error: `Stripe webhook signature verification failed: ${verificationError.message}` }, { status: 400 });
      }


      if (!event) { // Should be caught by try/catch above, but as a safeguard
        console.error("Stripe webhook: Invalid signature or event construction failed.");
        return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
      }

      console.log(`Stripe Webhook: Event constructed successfully. Event type: ${event.type}, Event ID: ${event.id}`);

      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Stripe Webhook: Processing PaymentIntent ID: ${paymentIntent.id}, Status: ${paymentIntent.status}`);

      switch (event.type) {
        case "payment_intent.succeeded":
        case "payment_intent.payment_failed":
        case "payment_intent.processing": // Good to log this too
        case "payment_intent.canceled":
          await finalizeStripeTransactionAndCreateOrder(paymentIntent.id, paymentIntent);
          break;
        default:
          console.log(`Stripe Webhook: Unhandled event type ${event.type}`);
      }
      console.log(`Stripe Webhook: Finished processing event ${event.id}.`);
      return NextResponse.json({ received: true, event: event.type });

    } else if (paymentProvider === "mpesa") {
      console.log("M-Pesa Webhook: Identified M-Pesa as provider.");
      const mpesaCallbackPayload: MpesaCallbackPayload = JSON.parse(rawBodyForLogging); 
      console.log("M-Pesa Webhook: Parsed M-Pesa Callback Payload:", JSON.stringify(mpesaCallbackPayload, null, 2));

      if (!mpesaCallbackPayload.Body || !mpesaCallbackPayload.Body.stkCallback) {
        console.error("M-Pesa webhook: Invalid callback structure received.");
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback structure received." }, { status: 400 });
      }

      const { stkCallback } = mpesaCallbackPayload.Body;
      const { CheckoutRequestID } = stkCallback;
      
      console.log(`M-Pesa Webhook: Processing callback for CheckoutRequestID ${CheckoutRequestID}, ResultCode: ${stkCallback.ResultCode}`);

      await updateTransactionAndCreateOrderIfNeeded(CheckoutRequestID, stkCallback); 
      
      console.log(`M-Pesa Webhook: Finished processing callback for ${CheckoutRequestID}.`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received successfully." });

    } else {
      console.warn(`Webhook: Unknown or missing payment provider header: '${paymentProvider}'. Trying to infer...`);
      try {
         const parsedBody = JSON.parse(rawBodyForLogging);
         if (parsedBody.Body && parsedBody.Body.stkCallback) {
            console.warn("Webhook: Payment provider header missing, inferred M-Pesa based on body structure.");
            const mpesaCallbackPl: MpesaCallbackPayload = parsedBody;
            const { stkCallback } = mpesaCallbackPl.Body;
            await updateTransactionAndCreateOrderIfNeeded(stkCallback.CheckoutRequestID, stkCallback);
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received successfully (inferred M-Pesa)." });
         } else if (parsedBody.type && typeof parsedBody.type === 'string' && parsedBody.type.startsWith('payment_intent.')) {
            console.warn("Webhook: Payment provider header missing, inferred Stripe based on body structure.");
            console.error("Stripe webhook inferred, but 'stripe-signature' header is MISSING. Cannot process securely without signature.");
            return NextResponse.json({ error: "Inferred Stripe event, but signature missing. Cannot process." }, { status: 400 });
         }
      } catch (parseError) {
        console.warn("Webhook: Could not parse body for inference or body doesn't match known structures.", parseError);
      }
      console.warn(`Webhook: Failed to identify provider. Body (first 200 chars): ${rawBodyForLogging.substring(0,200)}...`);
      return NextResponse.json({ error: "Unknown payment provider or malformed request." }, { status: 400 });
    }

  } catch (error: any) {
    console.error(`Webhook: Unhandled processing error for provider '${paymentProvider}':`, error.message);
    console.error("Webhook Error Stack:", error.stack);
    // For M-Pesa, they expect a specific error format.
    if (rawBodyForLogging.includes("stkCallback") && rawBodyForLogging.includes("Body")) { 
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Webhook processing failed internally due to an error." }, { status: 500 });
    }
    return NextResponse.json({ error: "Webhook processing failed: " + error.message }, { status: 500 });
  }
}
    
    