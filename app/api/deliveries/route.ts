import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDeliverySchema } from "@/lib/validations/delivery";
import { createDelivery, confirmDelivery } from "@/lib/services/deliveries";
import { initialisePaymentCheckout, PaymentProvider } from "@/lib/services/payment-checkout";
import { getYocoConfig } from "@/lib/yoco";
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
    const paymentMethod = body.payment_method;
    if (paymentMethod !== "payfast" && paymentMethod !== "yoco") {
      return errorResponse("Select PayFast or Yoco as the payment method.", undefined, 422);
    }
    if (paymentMethod === "yoco") {
      try {
        getYocoConfig();
      } catch {
        return errorResponse("Yoco sandbox is not configured yet. Please choose PayFast.", undefined, 503);
      }
    }
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

    // 5. Fetch customer details for the selected payment provider
    const userResult = await query<{ email: string; full_name: string }>(
      `SELECT email, full_name FROM users WHERE id = $1 LIMIT 1`,
      [session.userId]
    );
    const user = userResult.rows[0];

    const payment = await initialisePaymentCheckout({
      provider: paymentMethod as PaymentProvider,
      requestUrl: req.url,
      delivery: {
        id: delivery.id,
        quoteId: delivery.quote.id,
        customerId: session.userId,
        trackingNumber: delivery.trackingNumber,
        amount: delivery.quote.amount,
        currency: delivery.quote.currency,
        customerName: user?.full_name ?? "Customer",
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
