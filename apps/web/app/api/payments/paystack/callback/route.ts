import { verifyPaymentReturn } from "@/lib/services/payment-return";
import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
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

async function handleGET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) return dashboardRedirect("failed");

  const token = req.nextUrl.searchParams.get("app_return");
  const appReturn = token ? verifyPaymentReturn(token) : null;
  function redirect(result: "success" | "failed", id?: number) {
    if (appReturn && appReturn.reference === reference && appReturn.deliveryId === id) {
      return NextResponse.redirect(`ezygo://payment-return?token=${encodeURIComponent(token!)}`);
    }
    return dashboardRedirect(result, id);
  }
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
      return redirect("failed", deliveryId);
    }

    await completePayment({
      paymentId: payment.id,
      deliveryId,
      provider: "paystack",
      providerPaymentId: String(transaction.id),
    });
    return redirect("success", deliveryId);
  } catch (error) {
    logServerError("[Paystack callback] Processing failed", { reference, error });
    return redirect("failed", deliveryId);
  }
}

export const GET = withApiRoute("/api/payments/paystack/callback", handleGET);
