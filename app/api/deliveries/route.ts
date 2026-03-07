import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDeliverySchema } from "@/lib/validations/delivery";
import { createDelivery } from "@/lib/services/deliveries";
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
      const errors = result.error.flatten();
      // Flatten nested field errors into dot-notation keys for the frontend
      const fieldErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(errors.fieldErrors)) {
        if (msgs?.[0]) fieldErrors[key] = msgs[0];
      }
      // Handle nested address errors
      if (errors.fieldErrors) {
        const nested = result.error.issues;
        for (const issue of nested) {
          const path = issue.path.join(".");
          if (!fieldErrors[path]) fieldErrors[path] = issue.message;
        }
      }
      return errorResponse("Please fix the errors below.", fieldErrors, 422);
    }

    // 3. Create delivery via service (runs in a transaction)
    const delivery = await createDelivery(session.userId, result.data);

    return successResponse(
      "Delivery created successfully.",
      {
        id:             delivery.id,
        trackingNumber: delivery.trackingNumber,
        status:         delivery.status,
        quote: {
          id:       delivery.quote.id,
          amount:   delivery.quote.amount,
          currency: delivery.quote.currency,
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
