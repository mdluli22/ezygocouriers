import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { getPayFastConfig } from "@/lib/payfast";
import { completePayment } from "@/lib/services/payments";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api/response";

const sandboxConfirmationSchema = z.object({
  delivery_id: z.number().int().positive(),
  payment_id: z.number().int().positive(),
});

interface SandboxPayment {
  id: number;
  delivery_id: number;
  customer_id: number;
  status: string;
}

/**
 * Sandbox-only fallback for PayFast's one-shot ITN.
 *
 * This endpoint is deliberately disabled in live mode. It lets an authenticated
 * customer reconcile the exact payment attempt PayFast returned from when a
 * local proxy or test deployment prevented the sandbox ITN from arriving.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "customer") return forbiddenResponse();

    if (!getPayFastConfig().sandbox) {
      return errorResponse("Sandbox confirmation is disabled in live mode.", undefined, 403);
    }

    const parsed = sandboxConfirmationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse("Invalid sandbox payment confirmation.", undefined, 422);
    }

    const result = await query<SandboxPayment>(
      `SELECT id, delivery_id, customer_id, status
       FROM payments
       WHERE id = $1 AND delivery_id = $2 AND customer_id = $3
       LIMIT 1`,
      [parsed.data.payment_id, parsed.data.delivery_id, session.userId]
    );
    const payment = result.rows[0];

    if (!payment) {
      return errorResponse("Payment attempt not found.", undefined, 404);
    }

    if (payment.status === "complete") {
      await completePayment({
        paymentId: payment.id,
        deliveryId: payment.delivery_id,
        pfPaymentId: `sandbox-return-${payment.id}`,
      });
      return successResponse("Sandbox payment already confirmed.");
    }

    if (payment.status !== "pending") {
      return errorResponse(
        `Payment cannot be confirmed from status '${payment.status}'.`,
        undefined,
        409
      );
    }

    await completePayment({
      paymentId: payment.id,
      deliveryId: payment.delivery_id,
      pfPaymentId: `sandbox-return-${payment.id}`,
    });

    return successResponse("Sandbox payment confirmed.");
  } catch (error) {
    console.error("[POST /api/payments/sandbox-confirm]", error);
    return serverErrorResponse("Sandbox payment confirmation failed.");
  }
}
