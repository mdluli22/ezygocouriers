import { problemResponse } from "@/lib/api/response";
import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { getSession } from "@/lib/auth/session";
import { getAdminDeliveries, assignDriver } from "@/lib/services/admin";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { NextRequest } from "next/server";
import {
  adminAssignDriverSchema,
  adminDeliveryQuerySchema,
} from "@ezygo/contracts";
import { parseJsonRequest, parseQuery } from "@/lib/api/validation";

async function handleGET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = parseQuery(req.nextUrl.searchParams, adminDeliveryQuerySchema);
    if (!parsed.success) return parsed.response;

    const deliveries = await getAdminDeliveries(parsed.data.status);
    return successResponse("Deliveries fetched.", deliveries);
  } catch (error) {
    const problem = problemResponse(error);
    if (problem) return problem;
    logServerError("[GET /api/admin/deliveries]", error);
    return serverErrorResponse();
  }
}

async function handlePATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = await parseJsonRequest(req, adminAssignDriverSchema);
    if (!parsed.success) return parsed.response;
    const { delivery_id, driver_id } = parsed.data;

    await assignDriver(delivery_id, driver_id);
    return successResponse("Driver assigned successfully.");
  } catch (error) {
    const problem = problemResponse(error);
    if (problem) return problem;
    logServerError("[PATCH /api/admin/deliveries]", error);
    return serverErrorResponse();
  }
}

export const GET = withApiRoute("/api/admin/deliveries", handleGET);
export const PATCH = withApiRoute("/api/admin/deliveries", handlePATCH);
