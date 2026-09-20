import { withApiRoute } from "@/lib/api/route";
import { getSession } from "@/lib/auth/session";
import { getPushPublicConfig } from "@/lib/services/push-notifications";
import { successResponse, unauthorizedResponse } from "@/lib/api/response";

async function handleGET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  return successResponse("Push configuration loaded.", getPushPublicConfig());
}

export const GET = withApiRoute("/api/push/config", handleGET);
