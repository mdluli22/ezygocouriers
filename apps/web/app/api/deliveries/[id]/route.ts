import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getDeliveryById,
  getDeliveryStatusLogs,
  confirmDelivery,
  cancelCustomerDelivery,
} from "@/lib/services/deliveries";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import {
  customerDeliveryActionSchema,
  deliveryIdParamSchema,
} from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const parsedId = deliveryIdParamSchema.safeParse(id);
    if (!parsedId.success) return errorResponse("Invalid delivery ID.");
    const deliveryId = parsedId.data;

    const delivery = await getDeliveryById(deliveryId, session.userId);
    if (!delivery) return notFoundResponse("Delivery not found.");

    const logs = await getDeliveryStatusLogs(deliveryId);

    return successResponse("Delivery fetched.", { delivery, logs });
  } catch (error) {
    console.error("[GET /api/deliveries/[id]]", error);
    return serverErrorResponse();
  }
}

// POST to /api/deliveries/[id] with body { action: "confirm" | "cancel" }
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "customer") {
      return errorResponse("Only customers can update their deliveries.", undefined, 403);
    }

    const { id } = await params;
    const parsedId = deliveryIdParamSchema.safeParse(id);
    if (!parsedId.success) return errorResponse("Invalid delivery ID.");
    const deliveryId = parsedId.data;

    const parsed = await parseJsonRequest(req, customerDeliveryActionSchema);
    if (!parsed.success) return parsed.response;

    if (parsed.data.action === "confirm") {
      await confirmDelivery(deliveryId, session.userId);
      return successResponse("Delivery confirmed. Proceed to payment.");
    }

    await cancelCustomerDelivery(deliveryId, session.userId);
    return successResponse("Delivery cancelled.");
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Business rule errors (wrong status, unauthorized)
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("Cannot confirm") ||
        error.message.includes("Cannot cancel") ||
        error.message.includes("not found")
      ) {
        return errorResponse(error.message, undefined, 400);
      }
    }
    console.error("[POST /api/deliveries/[id]]", error);
    return serverErrorResponse();
  }
}
