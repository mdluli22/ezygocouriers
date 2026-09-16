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

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = parseQuery(req.nextUrl.searchParams, adminUserQuerySchema);
    if (!parsed.success) return parsed.response;

    const users = await getAdminUsers(parsed.data.role);
    return successResponse("Users fetched.", users);
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = await parseJsonRequest(req, adminToggleUserSchema);
    if (!parsed.success) return parsed.response;

    await toggleUserStatus(parsed.data.user_id, session.userId);
    return successResponse("User status toggled.");
  } catch (error: unknown) {
    console.error("[PATCH /api/admin/users]", error);
    if (error instanceof Error && error.message.includes("deactivate your own")) {
      return errorResponse(error.message, undefined, 403);
    }
    return serverErrorResponse();
  }
}
