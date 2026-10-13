import { getSession } from "@/lib/auth/session";
import { getUserAnalytics } from "@/lib/services/analytics";
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();
    return successResponse("User analytics.", await getUserAnalytics());
  } catch (error) {
    console.error("[Admin analytics]", error);
    return serverErrorResponse();
  }
}
