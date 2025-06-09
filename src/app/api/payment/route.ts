
import { NextResponse } from "next/server";
import { processPayment, type PaymentDetails } from "@/lib/payment-service";
import type { OrderItemInput } from "@/lib/actions/trackingActions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        method, 
        amount, 
        currency, 
        userId, 
        items, // Expect 'items' array instead of single 'bookId'
        email, 
        phoneNumber,
        regionCode, // Expect regionCode
        itemCount   // Expect itemCount
    }: { 
        method: PaymentDetails['paymentMethod'], 
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
      return NextResponse.json(
        { error: "Missing required fields (method, amount, currency, userId, items, regionCode, itemCount)" },
        { status: 400 }
      );
    }

    const paymentDetails: PaymentDetails = {
        amount,
        currency,
        userId,
        items, // Pass items array
        email,
        phoneNumber,
        regionCode,
        itemCount
    };

    const response = await processPayment(method, paymentDetails);

    if (!response.success) {
      return NextResponse.json({ error: response.error || "Payment processing failed at API route" }, { status: 400 });
    }
    // For M-Pesa, response.message might contain "STK Push initiated..."
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
