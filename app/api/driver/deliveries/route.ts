import { getSession } from "@/lib/auth/session";
import { getDriverDeliveries } from "@/lib/services/drivers";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const deliveries = await getDriverDeliveries(session.userId);
    return successResponse("Deliveries fetched.", deliveries);
  } catch (error) {
    console.error("[GET /api/driver/deliveries]", error);
    return serverErrorResponse();
  }
}
