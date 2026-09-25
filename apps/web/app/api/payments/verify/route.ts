import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonRequest } from "@/lib/api/validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api/response";
import { query } from "@/lib/db/server";
import { verifyPaymentReturn } from "@/lib/services/payment-return";
import { completePayment } from "@/lib/services/payments";
import { verifyPaystackTransaction, paystackTransactionMatches } from "@/lib/paystack";

export const POST = withApiRoute("/api/payments/verify", async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "customer") return errorResponse("Access denied.", undefined, 403);
  const parsed = await parseJsonRequest(req, z.object({ delivery_id: z.number().int().positive().optional(), token: z.string().max(2048).optional() }));
  if (!parsed.success) return parsed.response;
  const returned = parsed.data.token ? verifyPaymentReturn(parsed.data.token) : null;
  if (parsed.data.token && !returned) return errorResponse("Invalid or expired payment return.");
  const id = returned?.deliveryId ?? parsed.data.delivery_id;
  if (!id || (returned && parsed.data.delivery_id && id !== parsed.data.delivery_id)) return errorResponse("Invalid delivery.");
  const result = await query<{ id: number; delivery_id: number; status: string; provider_checkout_id: string; amount: string; currency: string }>(
    `SELECT p.id, p.delivery_id, p.status, p.provider_checkout_id, p.amount, p.currency FROM payments p JOIN deliveries d ON d.id=p.delivery_id
     WHERE d.id=$1 AND d.customer_id=$2 AND p.provider='paystack' ORDER BY p.id DESC LIMIT 1`, [id, session.userId]);
  const payment = result.rows[0];
  if (!payment) {
    const delivery = await query<{ status: string }>("SELECT status FROM deliveries WHERE id=$1 AND customer_id=$2", [id, session.userId]);
    if (!returned && delivery.rows[0]?.status === "confirmed") return successResponse("Checkout can be created.", { delivery_id: id, status: "not_started" });
    return errorResponse("Payment not found.", undefined, 404);
  }
  if (returned && returned.reference !== payment.provider_checkout_id) return errorResponse("Payment return does not match the current attempt.", undefined, 409);
  if (payment.status === "pending" && payment.provider_checkout_id) {
    const transaction = await verifyPaystackTransaction(payment.provider_checkout_id);
    if (paystackTransactionMatches({ transaction, reference: payment.provider_checkout_id, amount: Number(payment.amount), currency: payment.currency })) {
      await completePayment({ paymentId: payment.id, deliveryId: id, provider: "paystack", providerPaymentId: String(transaction.id) });
      payment.status = "complete";
    }
  }
  return successResponse("Payment checked.", { delivery_id: id, status: payment.status });
});
