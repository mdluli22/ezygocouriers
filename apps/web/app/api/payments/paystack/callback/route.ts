import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/server";
import {
  getPaystackConfig,
  paystackTransactionMatches,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { completePayment } from "@/lib/services/payments";

interface PaymentForCallback {
  id: number;
  delivery_id: number;
  amount: string;
  currency: string;
}

function dashboardRedirect(result: "success" | "failed", deliveryId?: number) {
  const configuredOrigin =
    process.env.PAYSTACK_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL("/dashboard", configuredOrigin);
  url.searchParams.set("payment", result);
  url.searchParams.set("provider", "paystack");
  if (deliveryId) url.searchParams.set("delivery", String(deliveryId));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) return dashboardRedirect("failed");

  let deliveryId: number | undefined;
  try {
    getPaystackConfig();
    const result = await query<PaymentForCallback>(
      `SELECT id, delivery_id, amount, currency
       FROM payments
       WHERE provider = 'paystack' AND provider_checkout_id = $1
       LIMIT 1`,
      [reference]
    );
    const payment = result.rows[0];
    if (!payment) return dashboardRedirect("failed");
    deliveryId = payment.delivery_id;

    const transaction = await verifyPaystackTransaction(reference);
    if (!paystackTransactionMatches({
      transaction,
      reference,
      amount: Number(payment.amount),
      currency: payment.currency,
    })) {
      return dashboardRedirect("failed", deliveryId);
    }

    await completePayment({
      paymentId: payment.id,
      deliveryId,
      provider: "paystack",
      providerPaymentId: String(transaction.id),
    });
    return dashboardRedirect("success", deliveryId);
  } catch (error) {
    console.error("[Paystack callback] Processing failed", { reference, error });
    return dashboardRedirect("failed", deliveryId);
  }
}
