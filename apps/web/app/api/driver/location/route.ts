import { z } from "zod";
import { query } from "@/lib/db/server";
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
      sessionId: session.sessionId,
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

export const DELETE = withApiRoute("/api/driver/location", async (request: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "driver") return forbiddenResponse();
  const parsed = await parseJsonRequest(request, z.object({ stopped_at: z.iso.datetime({ offset: true }) }));
  if (!parsed.success) return parsed.response;
  // An old offline stop must not erase a point captured after sharing restarted.
  await query(`UPDATE drivers SET current_latitude=NULL, current_longitude=NULL,
    location_updated_at=NULL, location_accuracy=NULL,location_delivery_id=NULL,location_session_id=NULL,location_received_at=NULL,
    location_stopped_at=GREATEST(COALESCE(location_stopped_at,'-infinity'::timestamptz),LEAST($2::timestamptz,NOW())) WHERE user_id=$1 AND
    (location_updated_at IS NULL OR location_updated_at <= LEAST($2::timestamptz, NOW()))`, [session.userId, parsed.data.stopped_at]);
  return successResponse("Location sharing stopped.");
});
