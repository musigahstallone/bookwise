import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyStripeWebhookSignature } from "@/lib/stripe-integration";
import { updateTransactionStatus } from "@/lib/payment-service";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const paymentProvider = headersList.get("x-payment-provider");

    switch (paymentProvider) {
      case "stripe": {
        const signature = headersList.get("stripe-signature");
        if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
          return NextResponse.json(
            { error: "Invalid webhook signature" },
            { status: 400 }
          );
        }

        const event = verifyStripeWebhookSignature(body, signature, {
          secretKey: process.env.STRIPE_SECRET_KEY!,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        });

        if (!event) {
          return NextResponse.json(
            { error: "Invalid webhook signature" },
            { status: 400 }
          );
        }

        if (event.type === "payment_intent.succeeded") {
          await updateTransactionStatus(event.data.object.id, "completed", {
            stripeEvent: event.type,
          });
        } else if (event.type === "payment_intent.payment_failed") {
          await updateTransactionStatus(event.data.object.id, "failed", {
            stripeEvent: event.type,
            failureMessage: event.data.object.last_payment_error?.message,
          });
        }
        break;
      }

      case "mpesa": {
        const mpesaCallback = JSON.parse(body);
        const { ResultCode, CheckoutRequestID } = mpesaCallback;

        await updateTransactionStatus(
          CheckoutRequestID,
          ResultCode === "0" ? "completed" : "failed",
          { mpesaResult: mpesaCallback }
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: "Unknown payment provider" },
          { status: 400 }
        );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
