import { NextRequest } from "next/server";
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
import { sandboxConfirmationSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";

interface SandboxPayment {
  id: number;
  delivery_id: number;
  customer_id: number;
  status: string;
  provider: string;
}

/**
 * Authenticated PayFast sandbox return reconciliation.
 *
 * This endpoint is deliberately disabled in live mode. It lets an authenticated
 * customer complete their exact no-money payment attempt after PayFast returns
 * them to the app. The sandbox ITN remains supported and this operation is
 * idempotent; live payments continue to rely exclusively on verified ITNs.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "customer") return forbiddenResponse();

    if (!getPayFastConfig().sandbox) {
      return errorResponse("Sandbox payment confirmation is not available in live mode.", undefined, 403);
    }

    const parsed = await parseJsonRequest(
      request,
      sandboxConfirmationSchema,
      "Invalid sandbox payment confirmation."
    );
    if (!parsed.success) return parsed.response;

    const result = await query<SandboxPayment>(
      `SELECT id, delivery_id, customer_id, status, provider
       FROM payments
       WHERE id = $1 AND delivery_id = $2 AND customer_id = $3
       LIMIT 1`,
      [parsed.data.payment_id, parsed.data.delivery_id, session.userId]
    );
    const payment = result.rows[0];

    if (!payment) {
      return errorResponse("Payment attempt not found.", undefined, 404);
    }
    if (payment.provider !== "payfast") {
      return errorResponse("This sandbox confirmation is only available for PayFast.", undefined, 409);
    }

    if (payment.status === "complete") {
      await completePayment({
        paymentId: payment.id,
        deliveryId: payment.delivery_id,
        provider: "payfast",
        providerPaymentId: `sandbox-return-${payment.id}`,
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
      provider: "payfast",
      providerPaymentId: `sandbox-return-${payment.id}`,
    });

    return successResponse("Sandbox payment confirmed.");
  } catch (error) {
    console.error("[POST /api/payments/sandbox-confirm]", error);
    return serverErrorResponse("Sandbox payment confirmation failed.");
  }
}
