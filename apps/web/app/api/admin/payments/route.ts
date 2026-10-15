import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { getPaymentReviews, resolvePaymentReview } from "@/lib/services/payment-reviews";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { applicationErrorResponse } from "@/lib/api/errors";
import { successResponse, forbiddenResponse, serverErrorResponse, errorResponse } from "@/lib/api/response";
import { parseJsonRequest } from "@/lib/api/validation";

export async function GET() {
  const session=await getSession();
  if (session?.role !== "admin") return forbiddenResponse();
  try {
    const [reviews,notifications] = await Promise.all([getPaymentReviews(),query(`SELECT n.id,n.kind,n.delivery_id,n.status,n.attempts,n.last_error,n.available_at,d.tracking_number
      FROM notification_outbox n LEFT JOIN deliveries d ON d.id=n.delivery_id
      WHERE n.status='failed' OR (n.status='pending' AND n.attempts>0) ORDER BY n.created_at DESC LIMIT 100`)]);
    return successResponse("Payment operations",{reviews,notifications:notifications.rows});
  } catch { return serverErrorResponse(); }
}
const actionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("resolve"),id:z.number().int().positive(),status:z.enum(["refunded","resolved"]),note:z.string().trim().min(10).max(1000),reference:z.string().trim().max(200).optional()}),
  z.object({action:z.literal("retry_notification"),id:z.number().int().positive()})
]);
export async function PATCH(request: NextRequest) {
  const session=await getSession();
  if (session?.role !== "admin") return forbiddenResponse();
  try {
    await consumeRateLimit(`payment-admin:${session.userId}`,30,60);
    const parsed=await parseJsonRequest(request,actionSchema); if (!parsed.success) return parsed.response;
    const data=parsed.data;
    if (data.action === "resolve") await resolvePaymentReview(data.id,session.userId,data.status,data.note,data.reference);
    else {
      const result=await query(`UPDATE notification_outbox SET status='pending',attempts=0,available_at=NOW(),last_error=NULL
        WHERE id=$1 AND status='failed' AND encrypted_payload IS NOT NULL RETURNING delivery_id`,[data.id]);
      if (!result.rowCount) return errorResponse("Only failed notifications can be retried.",undefined,409);
      if (result.rows[0].delivery_id) await query(`INSERT INTO delivery_status_logs(delivery_id,status,note,updated_by)
        SELECT id,status,'Admin retried a failed notification',$2 FROM deliveries WHERE id=$1`,[result.rows[0].delivery_id,session.userId]);
    }
    return successResponse("Updated successfully.");
  } catch (error) { return applicationErrorResponse(error) || serverErrorResponse(); }
}
