
import { NextResponse } from "next/server";
import { processPayment, type PaymentDetails, type PaymentMethod } from "@/lib/payment-service"; // Ensure PaymentMethod is exported
import type { OrderItemInput } from "@/lib/actions/trackingActions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        method, 
        amount, // For Stripe, this is in cents (USD). For M-Pesa, this should be KES (actual value).
        currency, // "usd" for Stripe, "KES" for M-Pesa.
        userId, 
        items, 
        email, 
        phoneNumber, // For M-Pesa
        regionCode, 
        itemCount,
        actualAmountInSelectedCurrency // The amount user sees and pays in their selected currency
    }: { 
        method: PaymentMethod,
        amount: number, 
        currency: string, 
        userId: string, 
        items: OrderItemInput[], 
        email?: string, 
        phoneNumber?:string,
        regionCode: string,
        itemCount: number,
        actualAmountInSelectedCurrency: number;
    } = body;

    const requiredFields: (keyof typeof body)[] = ['method', 'amount', 'currency', 'userId', 'items', 'regionCode', 'itemCount', 'actualAmountInSelectedCurrency'];
    const missingFields = requiredFields.filter(field => body[field] === undefined || (field === 'items' && (!Array.isArray(body.items) || body.items.length === 0)));

    if (missingFields.length > 0) {
      console.error("Missing required fields in /api/payment:", missingFields.join(', '), "Full body:", body);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const paymentDetails: PaymentDetails = {
        amount, // This is the API-specific amount (cents for stripe, KES for mpesa)
        currency,
        userId,
        items,
        email,
        phoneNumber,
        regionCode,
        itemCount,
        actualAmountInSelectedCurrency, // Amount in the currency the user selected/pays in
    };

    console.log(`Processing payment via API route for method: ${method}, user: ${userId}, amount: ${amount} ${currency}, actualDisplayAmount: ${actualAmountInSelectedCurrency} ${currency}`);
    const paymentApiResponse = await processPayment(method, paymentDetails); // processPayment now creates pending order first

    if (!paymentApiResponse.success) {
      console.error(`Payment processing failed in API for method ${method}:`, paymentApiResponse.error);
      // Return the orderId even on failure, so client can link to the failed/pending order
      return NextResponse.json({ error: paymentApiResponse.error || "Payment processing failed at API route", orderId: paymentApiResponse.orderId }, { status: 400 });
    }
    
    console.log(`Payment processing successful in API for method ${method}. Response:`, paymentApiResponse);
    // Return orderId along with other details like clientSecret for Stripe
    return NextResponse.json(paymentApiResponse);

  } catch (error) {
    console.error("Payment processing error in API route:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error during payment processing.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


    