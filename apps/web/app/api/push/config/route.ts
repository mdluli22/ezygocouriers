import { getSession } from "@/lib/auth/session";
import { getPushPublicConfig } from "@/lib/services/push-notifications";
import { successResponse, unauthorizedResponse } from "@/lib/api/response";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  return successResponse("Push configuration loaded.", getPushPublicConfig());
}
