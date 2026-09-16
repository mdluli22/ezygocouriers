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
import { deliveryIdParamSchema } from "@ezygo/contracts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const { id } = await params;
    const parsedId = deliveryIdParamSchema.safeParse(id);
    if (!parsedId.success) return notFoundResponse();
    const deliveryId = parsedId.data;

    const delivery = await getDriverDeliveryById(deliveryId, session.userId);
    if (!delivery) return notFoundResponse("Delivery not found.");

    const logs = await getDeliveryStatusLogs(deliveryId);
    return successResponse("Delivery fetched.", { delivery, logs });
  } catch (error) {
    console.error("[GET /api/driver/deliveries/[id]]", error);
    return serverErrorResponse();
  }
}
