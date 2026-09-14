import { getSession } from "@/lib/auth/session";
import { getAdminDeliveries, assignDriver } from "@/lib/services/admin";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { NextRequest } from "next/server";
import {
  adminAssignDriverSchema,
  adminDeliveryQuerySchema,
} from "@ezygo/contracts";
import { parseJsonRequest, parseQuery } from "@/lib/api/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = parseQuery(req.nextUrl.searchParams, adminDeliveryQuerySchema);
    if (!parsed.success) return parsed.response;

    const deliveries = await getAdminDeliveries(parsed.data.status);
    return successResponse("Deliveries fetched.", deliveries);
  } catch (error) {
    console.error("[GET /api/admin/deliveries]", error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = await parseJsonRequest(req, adminAssignDriverSchema);
    if (!parsed.success) return parsed.response;
    const { delivery_id, driver_id } = parsed.data;

    await assignDriver(delivery_id, driver_id);
    return successResponse("Driver assigned successfully.");
  } catch (error) {
    console.error("[PATCH /api/admin/deliveries]", error);
    return serverErrorResponse();
  }
}
