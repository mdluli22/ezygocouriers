import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { getSession } from "@/lib/auth/session";
import { getAdminUsers, toggleUserStatus } from "@/lib/services/admin";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { NextRequest } from "next/server";
import {
  adminToggleUserSchema,
  adminUserQuerySchema,
} from "@ezygo/contracts";
import { parseJsonRequest, parseQuery } from "@/lib/api/validation";

async function handleGET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = parseQuery(req.nextUrl.searchParams, adminUserQuerySchema);
    if (!parsed.success) return parsed.response;

    const users = await getAdminUsers(parsed.data.role);
    return successResponse("Users fetched.", users);
  } catch (error) {
    logServerError("[GET /api/admin/users]", error);
    return serverErrorResponse();
  }
}

async function handlePATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = await parseJsonRequest(req, adminToggleUserSchema);
    if (!parsed.success) return parsed.response;

    await toggleUserStatus(parsed.data.user_id, session.userId);
    return successResponse("User status toggled.");
  } catch (error: unknown) {
    logServerError("[PATCH /api/admin/users]", error);
    if (error instanceof Error && error.message.includes("deactivate your own")) {
      return errorResponse(error.message, undefined, 403);
    }
    return serverErrorResponse();
  }
}

export const GET = withApiRoute("/api/admin/users", handleGET);
export const PATCH = withApiRoute("/api/admin/users", handlePATCH);
