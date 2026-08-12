import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/server";
import { completePayment, cancelPayment } from "@/lib/services/payments";
import { verifyITN } from "@/lib/payfast";

interface PaymentForNotification {
  id: number;
  delivery_id: number;
  amount: string;
  status: "pending" | "complete" | "failed" | "cancelled";
}

function getSourceIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";

  return candidate.replace(/^::ffff:/, "");
}

export async function POST(request: NextRequest) {
  let paymentId: number | null = null;

  try {
    const rawBody = await request.text();
    const form = new URLSearchParams(rawBody);
    const itnData = Object.fromEntries(form.entries());

    paymentId = Number.parseInt(itnData.m_payment_id ?? "", 10);
    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      console.error("[PayFast ITN] Invalid payment ID", itnData.m_payment_id);
      return new NextResponse("Invalid payment ID", { status: 400 });
    }

    const result = await query<PaymentForNotification>(
      `SELECT id, delivery_id, amount, status
       FROM payments
       WHERE id = $1
       LIMIT 1`,
      [paymentId]
    );
    const payment = result.rows[0];

    if (!payment) {
      console.error("[PayFast ITN] Payment not found", paymentId);
      return new NextResponse("Payment not found", { status: 404 });
    }

    if (
      itnData.custom_str1 &&
      Number.parseInt(itnData.custom_str1, 10) !== payment.delivery_id
    ) {
      console.error("[PayFast ITN] Delivery mismatch", {
        paymentId,
        expected: payment.delivery_id,
        received: itnData.custom_str1,
      });
      return new NextResponse("Delivery mismatch", { status: 400 });
    }

    const verification = await verifyITN({
      itnData,
      expectedAmount: Number(payment.amount),
      sourceIp: getSourceIp(request),
    });

    if (!verification.valid) {
      console.error("[PayFast ITN] Verification failed", {
        paymentId,
        reason: verification.reason,
      });
      return new NextResponse("Invalid notification", { status: 400 });
    }

    if (itnData.payment_status === "COMPLETE") {
      await completePayment({
        paymentId,
        deliveryId: payment.delivery_id,
        pfPaymentId: itnData.pf_payment_id,
      });
    } else if (itnData.payment_status === "CANCELLED") {
      await cancelPayment(paymentId, "Payment cancelled through PayFast");
    } else {
      console.warn("[PayFast ITN] Ignoring unsupported status", {
        paymentId,
        status: itnData.payment_status,
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[PayFast ITN] Processing failed", { paymentId, error });
    return new NextResponse("Notification processing failed", { status: 500 });
  }
}
