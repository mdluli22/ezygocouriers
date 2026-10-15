import { NextRequest } from "next/server";
import { deliveryIdParamSchema } from "@ezygo/contracts";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { recoverRecipientPin } from "@/lib/services/notification-outbox";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { applicationErrorResponse } from "@/lib/api/errors";
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from "@/lib/api/response";
type Context={params:Promise<{id:string}>};

export async function GET(_request: NextRequest,{params}:Context) {
  try {
    const session=await getSession(); if (!session) return unauthorizedResponse();
    const id=deliveryIdParamSchema.safeParse((await params).id); if (!id.success) return notFoundResponse();
    const delivery=await query("SELECT id FROM deliveries WHERE id=$1 AND (customer_id=$2 OR $3)",[id.data,session.userId,session.role === "admin"]);
    if (!delivery.rowCount) return notFoundResponse();
    const reviews=await query("SELECT id,status,amount,currency,refund_reference,resolved_at FROM payment_reviews WHERE delivery_id=$1 ORDER BY created_at DESC",[id.data]);
    const jobs=await query("SELECT status,attempts FROM notification_outbox WHERE delivery_id=$1 AND kind='pin_email' ORDER BY id DESC LIMIT 1",[id.data]);
    return successResponse("Delivery recovery",{reviews:reviews.rows,pin:jobs.rows[0] ?? null});
  } catch { return serverErrorResponse(); }
}
export async function POST(_request: NextRequest,{params}:Context) {
  try {
    const session=await getSession(); if (!session) return unauthorizedResponse();
    const id=deliveryIdParamSchema.safeParse((await params).id); if (!id.success) return notFoundResponse();
    await consumeRateLimit(`pin-resend:${session.userId}:${id.data}`,3,900);
    await recoverRecipientPin(id.data,session.userId,session.role === "admin");
    return successResponse("A new PIN has been queued for the recipient. The previous PIN is no longer valid.");
  } catch (error) { return applicationErrorResponse(error) || serverErrorResponse(); }
}
