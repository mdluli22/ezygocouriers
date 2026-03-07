import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getDeliveryById,
  getDeliveryStatusLogs,
  confirmDelivery,
} from "@/lib/services/deliveries";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const deliveryId = parseInt(id);
    if (isNaN(deliveryId)) return errorResponse("Invalid delivery ID.");

    const delivery = await getDeliveryById(deliveryId, session.userId);
    if (!delivery) return notFoundResponse("Delivery not found.");

    const logs = await getDeliveryStatusLogs(deliveryId);

    return successResponse("Delivery fetched.", { delivery, logs });
  } catch (error) {
    console.error("[GET /api/deliveries/[id]]", error);
    return serverErrorResponse();
  }
}

// POST to /api/deliveries/[id] with body { action: "confirm" }
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "customer") {
      return errorResponse("Only customers can confirm deliveries.", undefined, 403);
    }

    const { id } = await params;
    const deliveryId = parseInt(id);
    if (isNaN(deliveryId)) return errorResponse("Invalid delivery ID.");

    const body = await req.json();
    if (body?.action !== "confirm") {
      return errorResponse("Unknown action.");
    }

    await confirmDelivery(deliveryId, session.userId);

    return successResponse("Delivery confirmed. Proceed to payment.");
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Business rule errors (wrong status, unauthorized)
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("Cannot confirm") ||
        error.message.includes("not found")
      ) {
        return errorResponse(error.message, undefined, 400);
      }
    }
    console.error("[POST /api/deliveries/[id]]", error);
    return serverErrorResponse();
  }
}
