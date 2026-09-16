import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/server";
import {
  PaystackTransaction,
  paystackTransactionMatches,
  verifyPaystackWebhook,
} from "@/lib/paystack";
import { completePayment } from "@/lib/services/payments";

interface PaystackEvent {
  event: string;
  data: PaystackTransaction;
}

interface PaymentForWebhook {
  id: number;
  delivery_id: number;
  amount: string;
  currency: string;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    if (!verifyPaystackWebhook(rawBody, req.headers.get("x-paystack-signature"))) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(rawBody) as PaystackEvent;
    if (event.event !== "charge.success") return new NextResponse("OK");

    const reference = event.data.reference;
    const result = await query<PaymentForWebhook>(
      `SELECT id, delivery_id, amount, currency
       FROM payments
       WHERE provider = 'paystack' AND provider_checkout_id = $1
       LIMIT 1`,
      [reference]
    );
    const payment = result.rows[0];
    if (!payment) return new NextResponse("Payment not found", { status: 404 });

    if (!paystackTransactionMatches({
      transaction: event.data,
      reference,
      amount: Number(payment.amount),
      currency: payment.currency,
    })) {
      return new NextResponse("Payment details do not match", { status: 400 });
    }

    await completePayment({
      paymentId: payment.id,
      deliveryId: payment.delivery_id,
      provider: "paystack",
      providerPaymentId: String(event.data.id),
    });
    return new NextResponse("OK");
  } catch (error) {
    console.error("[Paystack webhook] Processing failed", error);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
