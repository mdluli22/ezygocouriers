import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from "@/lib/api/response";
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "customer" && session.role !== "driver") return forbiddenResponse();
    const result = await query(`SELECT count(*)::int AS all,
      count(*) FILTER (WHERE d.status NOT IN ('delivered','cancelled','failed'))::int AS active,
      count(*) FILTER (WHERE d.status IN ('delivered','cancelled','failed'))::int AS history,
      count(*) FILTER (WHERE d.status='assigned')::int AS assigned,
      count(*) FILTER (WHERE d.status='delivered')::int AS delivered
      FROM deliveries d ${session.role === "driver" ? "JOIN drivers dr ON dr.id=d.assigned_driver_id WHERE dr.user_id=$1" : "WHERE d.customer_id=$1"}`, [session.userId]);
    return successResponse("Delivery totals.", result.rows[0]);
  } catch { return serverErrorResponse("Delivery totals are unavailable."); }
}
