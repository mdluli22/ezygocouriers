import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/server";
import { completePayment, failPayment } from "@/lib/services/payments";
import { getYocoConfig, verifyYocoWebhook } from "@/lib/yoco";

interface YocoEvent {
  id: string;
  type: string;
  payload: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    mode: "test" | "live";
    metadata?: Record<string, unknown>;
  };
}

interface PaymentForWebhook {
  id: number;
  delivery_id: number;
  amount: string;
  currency: string;
  status: string;
  provider: string;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const webhookId = request.headers.get("webhook-id") ?? "";
    const webhookTimestamp = request.headers.get("webhook-timestamp") ?? "";
    const webhookSignature = request.headers.get("webhook-signature") ?? "";

    if (!verifyYocoWebhook({ rawBody, webhookId, webhookTimestamp, webhookSignature })) {
      return new NextResponse("Invalid webhook signature", { status: 400 });
    }

    const event = JSON.parse(rawBody) as YocoEvent;
    const checkoutId = String(event.payload?.metadata?.checkoutId ?? "");
    if (!checkoutId) {
      return new NextResponse("Missing checkout ID", { status: 400 });
    }

    const result = await query<PaymentForWebhook>(
      `SELECT id, delivery_id, amount, currency, status, provider
       FROM payments
       WHERE provider_checkout_id = $1
       LIMIT 1`,
      [checkoutId]
    );
    const payment = result.rows[0];

    if (!payment) return new NextResponse("Payment not found", { status: 404 });
    if (payment.provider !== "yoco") {
      return new NextResponse("Payment provider mismatch", { status: 409 });
    }

    const expectedMode = getYocoConfig().sandbox ? "test" : "live";
    if (
      event.payload.mode !== expectedMode ||
      event.payload.currency !== payment.currency ||
      event.payload.amount !== Math.round(Number(payment.amount) * 100)
    ) {
      return new NextResponse("Payment details do not match", { status: 400 });
    }

    if (event.type === "payment.succeeded" && event.payload.status === "succeeded") {
      await completePayment({
        paymentId: payment.id,
        deliveryId: payment.delivery_id,
        provider: "yoco",
        providerPaymentId: event.payload.id,
      });
    } else if (event.payload.status === "failed") {
      await failPayment(payment.id, "Payment failed through Yoco");
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[Yoco webhook] Processing failed", error);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
