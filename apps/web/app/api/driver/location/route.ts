import { problemResponse } from "@/lib/api/response";
import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateDriverLocation } from "@/lib/services/driver-assignment";
import { driverLocationSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  forbiddenResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api/response";

async function handlePATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const parsed = await parseJsonRequest(
      request,
      driverLocationSchema,
      "Invalid driver location."
    );
    if (!parsed.success) return parsed.response;

    const assignment = await updateDriverLocation({
      driverUserId: session.userId,
      ...parsed.data,
    });

    return successResponse(
      assignment
        ? "Location updated and a delivery was assigned."
        : "Location updated.",
      { assignment }
    );
  } catch (error) {
    const problem = problemResponse(error);
    if (problem) return problem;
    logServerError("[PATCH /api/driver/location]", error);
    return serverErrorResponse("Failed to update driver location.");
  }
}

export const PATCH = withApiRoute("/api/driver/location", handlePATCH);
