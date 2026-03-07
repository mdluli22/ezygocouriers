import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDriverDeliveryById } from "@/lib/services/drivers";
import { getDeliveryStatusLogs } from "@/lib/services/deliveries";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
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
    if (session.role !== "driver") return forbiddenResponse();

    const { id } = await params;
    const deliveryId = parseInt(id);
    if (isNaN(deliveryId)) return notFoundResponse();

    const delivery = await getDriverDeliveryById(deliveryId, session.userId);
    if (!delivery) return notFoundResponse("Delivery not found.");

    const logs = await getDeliveryStatusLogs(deliveryId);
    return successResponse("Delivery fetched.", { delivery, logs });
  } catch (error) {
    console.error("[GET /api/driver/deliveries/[id]]", error);
    return serverErrorResponse();
  }
}
