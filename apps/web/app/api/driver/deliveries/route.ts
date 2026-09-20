import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { getSession } from "@/lib/auth/session";
import { getDriverDeliveries } from "@/lib/services/drivers";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";

async function handleGET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const deliveries = await getDriverDeliveries(session.userId);
    return successResponse("Deliveries fetched.", deliveries);
  } catch (error) {
    logServerError("[GET /api/driver/deliveries]", error);
    return serverErrorResponse();
  }
}

export const GET = withApiRoute("/api/driver/deliveries", handleGET);
