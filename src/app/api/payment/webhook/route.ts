
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyStripeWebhookSignature } from "@/lib/stripe-integration";
import { updateTransactionStatus } from "@/lib/payment-service"; // Ensure this path is correct

// M-Pesa Callback Payload Structure (Simplified)
interface MpesaStkCallbackItem {
  Name: string;
  Value: string | number;
}
interface MpesaStkCallbackResult {
  ResultCode: number; // 0 for success
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
  const headersList = headers(); // Use this to get headers
  const paymentProvider = headersList.get("x-payment-provider") || headersList.get("X-Payment-Provider"); // Check for case variations

  // Log all incoming headers for debugging
  // console.log("Incoming Webhook Headers:", Object.fromEntries(headersList.entries()));
  
  // Log the raw body for debugging purposes, carefully in production
  const rawBodyForLogging = await request.clone().text(); // Clone to read body without consuming it for parsers
  // console.log("Incoming Webhook Raw Body for provider", paymentProvider, ":", rawBodyForLogging);


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

      // Handle the event
      let paymentIntent;
      let status: "completed" | "failed" | "pending" = "pending";
      let metadata: Record<string, any> = { stripeEvent: event.type };

      switch (event.type) {
        case "payment_intent.succeeded":
          paymentIntent = event.data.object;
          status = "completed";
          metadata.amount_received = paymentIntent.amount_received;
          metadata.currency = paymentIntent.currency;
          console.log(`Stripe Webhook: PaymentIntent ${paymentIntent.id} succeeded.`);
          await updateTransactionStatus(paymentIntent.id, status, metadata);
          break;
        case "payment_intent.payment_failed":
          paymentIntent = event.data.object;
          status = "failed";
          metadata.failure_message = paymentIntent.last_payment_error?.message;
          metadata.failure_code = paymentIntent.last_payment_error?.code;
          console.log(`Stripe Webhook: PaymentIntent ${paymentIntent.id} failed. Reason: ${metadata.failure_message}`);
          await updateTransactionStatus(paymentIntent.id, status, metadata);
          break;
        // Add other event types as needed (e.g., payment_intent.processing, payment_intent.canceled)
        default:
          console.log(`Stripe Webhook: Unhandled event type ${event.type}`);
      }
      return NextResponse.json({ received: true, event: event.type });

    } else if (paymentProvider === "mpesa") {
      const mpesaCallback: MpesaCallbackPayload = await request.json();
      // console.log("Parsed M-Pesa Callback:", JSON.stringify(mpesaCallback, null, 2));

      if (!mpesaCallback.Body || !mpesaCallback.Body.stkCallback) {
        console.error("M-Pesa webhook: Invalid callback structure.");
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback structure received." }, { status: 400 });
      }

      const { stkCallback } = mpesaCallback.Body;
      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
      
      const mpesaMetadata: Record<string, any> = { 
        mpesaResultCode: ResultCode,
        mpesaResultDesc: ResultDesc,
        merchantRequestID: stkCallback.MerchantRequestID,
      };

      if (CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
        CallbackMetadata.Item.forEach(item => {
          mpesaMetadata[item.Name] = item.Value;
        });
      }
      
      // Log the M-Pesa receipt number if available
      if (mpesaMetadata.MpesaReceiptNumber) {
         console.log(`M-Pesa Webhook: Received MpesaReceiptNumber ${mpesaMetadata.MpesaReceiptNumber} for CheckoutRequestID ${CheckoutRequestID}`);
      }


      await updateTransactionStatus(
        CheckoutRequestID,
        ResultCode === 0 ? "completed" : "failed",
        mpesaMetadata
      );
      
      // Acknowledge Safaricom
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received successfully." });

    } else {
      console.warn(`Webhook: Unknown payment provider: ${paymentProvider}`);
      return NextResponse.json({ error: "Unknown payment provider specified in x-payment-provider header." }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    // For M-Pesa, if it's their callback, they expect a specific format on error too.
    // But for a general error, a 500 is appropriate.
    if (paymentProvider === "mpesa") {
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Webhook processing failed internally." }, { status: 500 });
    }
    return NextResponse.json({ error: "Webhook processing failed: " + error.message }, { status: 500 });
  }
}
