import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { NextRequest } from "next/server";
import {
  deletePushSubscriptionSchema,
  pushSubscriptionSchema,
} from "@ezygo/contracts";
import { getSession } from "@/lib/auth/session";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/services/push-notifications";
import {
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api/response";

async function handlePOST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    const parsed = await parseJsonRequest(
      request,
      pushSubscriptionSchema,
      "Invalid push subscription."
    );
    if (!parsed.success) return parsed.response;
    await savePushSubscription(session.userId, parsed.data);
    return successResponse("Notifications enabled.");
  } catch (error) {
    logServerError("[POST /api/push/subscriptions]", error);
    return serverErrorResponse("Could not save notification preferences.");
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    const parsed = await parseJsonRequest(
      request,
      deletePushSubscriptionSchema,
      "Invalid push subscription."
    );
    if (!parsed.success) return parsed.response;
    await removePushSubscription(session.userId, parsed.data.endpoint);
    return successResponse("Notifications disabled.");
  } catch (error) {
    logServerError("[DELETE /api/push/subscriptions]", error);
    return serverErrorResponse("Could not update notification preferences.");
  }
}

export const POST = withApiRoute("/api/push/subscriptions", handlePOST);
export const DELETE = withApiRoute("/api/push/subscriptions", handleDELETE);
