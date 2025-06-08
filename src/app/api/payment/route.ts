import { NextResponse } from "next/server";
import { processPayment } from "@/lib/payment-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, amount, currency, userId, bookId, email, phoneNumber } =
      body;

    if (!method || !amount || !currency || !userId || !bookId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await processPayment(method, {
      amount,
      currency,
      userId,
      bookId,
      email,
      phoneNumber,
    });

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}
