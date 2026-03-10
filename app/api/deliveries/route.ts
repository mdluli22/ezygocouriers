import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDeliverySchema } from "@/lib/validations/delivery";
import { createDelivery, confirmDelivery } from "@/lib/services/deliveries";
import { createPaymentRecord } from "@/lib/services/payments";
import { buildPaymentData, PAYFAST_HOST } from "@/lib/payfast";
import { query } from "@/lib/db/server";
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
    const body = await req.json();
    const result = createDeliverySchema.safeParse(body);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      return errorResponse("Please fix the errors below.", fieldErrors, 422);
    }

    // 3. Create delivery (quoted status)
    const delivery = await createDelivery(session.userId, result.data);

    // 4. Auto-confirm delivery (customer accepted at form submit)
    await confirmDelivery(delivery.id, session.userId);

    // 5. Fetch user info for PayFast form
    const userResult = await query<{ email: string; full_name: string }>(
      `SELECT email, full_name FROM users WHERE id = $1 LIMIT 1`,
      [session.userId]
    );
    const user = userResult.rows[0];

    // 6. Create pending payment record
    const paymentId = await createPaymentRecord({
      deliveryId: delivery.id,
      quoteId:    delivery.quote.id,
      customerId: session.userId,
      amount:     delivery.quote.amount,
      currency:   delivery.quote.currency,
    });

    // 7. Build PayFast form data
    const payfastData = buildPaymentData({
      paymentId,
      deliveryId:     delivery.id,
      trackingNumber: delivery.trackingNumber,
      amount:         delivery.quote.amount,
      customerName:   user?.full_name ?? "Customer",
      customerEmail:  user?.email ?? "",
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
        payfast: {
          url:       `${PAYFAST_HOST}/eng/process`,
          form_data: payfastData,
        },
      },
      201
    );
  } catch (error) {
    console.error("[POST /api/deliveries]", error);
    return serverErrorResponse("Failed to create delivery. Please try again.");
  }
}

export async function GET(req: NextRequest) {
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
