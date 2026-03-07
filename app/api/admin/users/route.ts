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

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const role = req.nextUrl.searchParams.get("role") ?? undefined;
    const users = await getAdminUsers(role);
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

    const body = await req.json();
    const { user_id } = body;

    if (!user_id) return errorResponse("user_id is required.", undefined, 422);

    await toggleUserStatus(Number(user_id), session.userId);
    return successResponse("User status toggled.");
  } catch (error: unknown) {
    console.error("[PATCH /api/admin/users]", error);
    if (error instanceof Error && error.message.includes("deactivate your own")) {
      return errorResponse(error.message, undefined, 403);
    }
    return serverErrorResponse();
  }
}
