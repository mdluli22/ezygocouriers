import { problemResponse } from "@/lib/api/response";
import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateDeliveryStatus } from "@/lib/services/drivers";
import { driverStatusUpdateSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";

async function handlePATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const parsed = await parseJsonRequest(
      req,
      driverStatusUpdateSchema,
      "Invalid request."
    );
    if (!parsed.success) return parsed.response;
    const { delivery_id, status, note, pin } = parsed.data;

    await updateDeliveryStatus(delivery_id, session.userId, status, note, pin);

    return successResponse(`Delivery status updated to '${status}'.`);
  } catch (error: unknown) {
    const problem = problemResponse(error);
    if (problem) return problem;
    if (error instanceof Error) {
      if (
        error.message.includes("not assigned") ||
        error.message.includes("Cannot transition") ||
        error.message.includes("not found") ||
        error.message.includes("PIN")
      ) {
        return errorResponse(error.message, undefined, 400);
      }
    }
    logServerError("[PATCH /api/driver/status]", error);
    return serverErrorResponse();
  }
}

export const PATCH = withApiRoute("/api/driver/status", handlePATCH);
