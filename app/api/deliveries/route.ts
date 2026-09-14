import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDelivery, confirmDelivery } from "@/lib/services/deliveries";
import { initialisePaymentCheckout } from "@/lib/services/payment-checkout";
import { getPaystackConfig } from "@/lib/paystack";
import { query } from "@/lib/db/server";
import { createDeliveryRequestSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "customer") {
      return errorResponse("Only customers can create deliveries.", undefined, 403);
    }

    // 2. Validate input
    const parsed = await parseJsonRequest(req, createDeliveryRequestSchema);
    if (!parsed.success) return parsed.response;
    const { payment_method: paymentMethod, ...deliveryInput } = parsed.data;

    try {
      getPaystackConfig();
    } catch {
      return errorResponse("Paystack test checkout is not configured yet.", undefined, 503);
    }
    // 3. Create delivery (quoted status)
    const delivery = await createDelivery(session.userId, deliveryInput);

    // 4. Auto-confirm delivery (customer accepted at form submit)
    await confirmDelivery(delivery.id, session.userId);

    // 5. Fetch customer details for the selected payment provider
    const userResult = await query<{ email: string; full_name: string }>(
      `SELECT email, full_name FROM users WHERE id = $1 LIMIT 1`,
      [session.userId]
    );
    const user = userResult.rows[0];

    const payment = await initialisePaymentCheckout({
      provider: paymentMethod,
      delivery: {
        id: delivery.id,
        quoteId: delivery.quote.id,
        customerId: session.userId,
        trackingNumber: delivery.trackingNumber,
        amount: delivery.quote.amount,
        currency: delivery.quote.currency,
        customerEmail: user?.email ?? "",
      },
    });

    return successResponse(
      "Delivery confirmed. Proceed to payment.",
      {
        id:             delivery.id,
        trackingNumber: delivery.trackingNumber,
        quote: {
          amount:   delivery.quote.amount,
          currency: delivery.quote.currency,
        },
        payment,
      },
      201
    );
  } catch (error) {
    console.error("[POST /api/deliveries]", error);
    return serverErrorResponse("Failed to create delivery. Please try again.");
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "customer") {
      return errorResponse("Access denied.", undefined, 403);
    }

    const { getCustomerDeliveries } = await import("@/lib/services/deliveries");
    const deliveries = await getCustomerDeliveries(session.userId);

    return successResponse("Deliveries fetched.", deliveries);
  } catch (error) {
    console.error("[GET /api/deliveries]", error);
    return serverErrorResponse();
  }
}
