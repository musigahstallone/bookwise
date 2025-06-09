
import { NextResponse } from "next/server";
import { processPayment, type PaymentDetails, type PaymentMethod } from "@/lib/payment-service"; // Ensure PaymentMethod is exported
import type { OrderItemInput } from "@/lib/actions/trackingActions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        method, 
        amount, // For Stripe, this is in cents (USD). For M-Pesa, this should be KES.
        currency, // "usd" for Stripe, "KES" for M-Pesa.
        userId, 
        items, 
        email, 
        phoneNumber, // For M-Pesa
        regionCode, 
        itemCount   
    }: { 
        method: PaymentMethod, // Use the imported type
        amount: number, 
        currency: string, 
        userId: string, 
        items: OrderItemInput[], 
        email?: string, 
        phoneNumber?:string,
        regionCode: string,
        itemCount: number
    } = body;

    if (!method || amount === undefined || !currency || !userId || !items || items.length === 0 || !regionCode || itemCount === undefined ) {
      console.error("Missing required fields in /api/payment:", {method, amount, currency, userId, items_length: items?.length, regionCode, itemCount});
      return NextResponse.json(
        { error: "Missing required fields (method, amount, currency, userId, items, regionCode, itemCount)" },
        { status: 400 }
      );
    }

    const paymentDetails: PaymentDetails = {
        amount,
        currency,
        userId,
        items,
        email,
        phoneNumber, // Will be undefined for Stripe, present for M-Pesa
        regionCode,
        itemCount,
    };

    console.log(`Processing payment via API route for method: ${method}, user: ${userId}, amount: ${amount} ${currency}`);
    const response = await processPayment(method, paymentDetails);

    if (!response.success) {
      console.error(`Payment processing failed in API for method ${method}:`, response.error);
      return NextResponse.json({ error: response.error || "Payment processing failed at API route" }, { status: 400 });
    }
    
    console.log(`Payment processing successful in API for method ${method}. Response:`, response);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Payment processing error in API route:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error during payment processing.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
