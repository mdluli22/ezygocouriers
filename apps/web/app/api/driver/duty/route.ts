import { NextRequest } from "next/server";
import { driverDutySchema } from "@ezygo/contracts";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonRequest } from "@/lib/api/validation";
import { successResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api/response";
export const GET = withApiRoute("/api/driver/duty", async () => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "driver") return forbiddenResponse();
  const result = await query<{on_duty:boolean}>("SELECT on_duty FROM drivers WHERE user_id=$1 AND status='active'",[session.userId]);
  if (!result.rows[0]) return forbiddenResponse();
  return successResponse("Duty status.",result.rows[0]);
});
export const PATCH = withApiRoute("/api/driver/duty", async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "driver") return forbiddenResponse();
  const parsed = await parseJsonRequest(req,driverDutySchema);
  if (!parsed.success) return parsed.response;
  const result = await query(`UPDATE drivers SET on_duty=$2,
    current_latitude=CASE WHEN $2 THEN current_latitude ELSE NULL END,
    current_longitude=CASE WHEN $2 THEN current_longitude ELSE NULL END,
    location_updated_at=CASE WHEN $2 THEN location_updated_at ELSE NULL END,
    location_received_at=CASE WHEN $2 THEN location_received_at ELSE NULL END,
    location_delivery_id=CASE WHEN $2 THEN location_delivery_id ELSE NULL END,
    location_session_id=CASE WHEN $2 THEN location_session_id ELSE NULL END,
    location_accuracy=CASE WHEN $2 THEN location_accuracy ELSE NULL END,
    location_stopped_at=CASE WHEN $2 THEN location_stopped_at ELSE NOW() END
    WHERE user_id=$1 AND status='active' RETURNING on_duty`,[session.userId,parsed.data.on_duty]);
  if (!result.rows[0]) return forbiddenResponse();
  return successResponse("Duty status updated.",result.rows[0]);
});
