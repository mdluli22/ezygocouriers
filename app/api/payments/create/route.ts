import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { initialisePaymentCheckout } from "@/lib/services/payment-checkout";
import { getPaystackConfig } from "@/lib/paystack";
import { createPaymentSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();

    const parsed = await parseJsonRequest(req, createPaymentSchema);
    if (!parsed.success) return parsed.response;
    const { delivery_id, payment_method } = parsed.data;
    try {
      getPaystackConfig();
    } catch {
      return errorResponse("Paystack test checkout is not configured yet.", undefined, 503);
    }

    // 1. Fetch delivery — verify ownership and status
    const result = await query<{
      id: number;
      tracking_number: string;
      status: string;
      quote_id: number;
      quote_amount: string;
      quote_currency: string;
      customer_id: number;
      customer_email: string;
      customer_name: string;
    }>(
      `SELECT
         d.id,
         d.tracking_number,
         d.status,
         d.quote_id,
         d.customer_id,
         q.amount        AS quote_amount,
         q.currency      AS quote_currency,
         u.email         AS customer_email,
         u.full_name     AS customer_name
       FROM deliveries d
       LEFT JOIN quotes q ON q.id = d.quote_id
       LEFT JOIN users  u ON u.id = d.customer_id
       WHERE d.id = $1 AND d.customer_id = $2
       LIMIT 1`,
      [delivery_id, session.userId]
    );

    const delivery = result.rows[0];

    if (!delivery) {
      return errorResponse("Delivery not found.", undefined, 404);
    }

    if (delivery.status !== "confirmed") {
      return errorResponse(
        `Delivery must be in 'confirmed' status to pay. Current: '${delivery.status}'.`,
        undefined,
        409
      );
    }

    const amount = parseFloat(delivery.quote_amount);

    const checkout = await initialisePaymentCheckout({
      provider: payment_method,
      delivery: {
        id: delivery.id,
        quoteId: delivery.quote_id,
        customerId: delivery.customer_id,
        trackingNumber: delivery.tracking_number,
        amount,
        currency: delivery.quote_currency,
        customerEmail: delivery.customer_email,
      },
    });

    return successResponse("Payment initialised.", checkout);
  } catch (error) {
    console.error("[POST /api/payments/create]", error);
    return serverErrorResponse();
  }
}
