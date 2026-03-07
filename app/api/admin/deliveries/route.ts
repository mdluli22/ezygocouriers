import { getSession } from "@/lib/auth/session";
import { getAdminDeliveries, assignDriver } from "@/lib/services/admin";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { NextRequest } from "next/server";
import { DeliveryStatus } from "@/lib/auth/delivery-status";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const status = req.nextUrl.searchParams.get("status") as DeliveryStatus | "all" | null;
    const deliveries = await getAdminDeliveries(status ?? "all");
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

    const body = await req.json();
    const { delivery_id, driver_id } = body;

    if (!delivery_id || !driver_id) {
      return errorResponse("delivery_id and driver_id are required.", undefined, 422);
    }

    await assignDriver(Number(delivery_id), Number(driver_id));
    return successResponse("Driver assigned successfully.");
  } catch (error) {
    console.error("[PATCH /api/admin/deliveries]", error);
    return serverErrorResponse();
  }
}
