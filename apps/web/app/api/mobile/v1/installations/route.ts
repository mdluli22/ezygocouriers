import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { installationIdentitySchema, installationSchema } from "@ezygo/contracts";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonRequest } from "@/lib/api/validation";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api/response";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const POST = withApiRoute("/api/mobile/v1/installations", async (request: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const parsed = await parseJsonRequest(request, installationSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;
  try {
    const result = await query(`INSERT INTO native_installations(id,secret_hash,user_id,session_id,expo_token,platform)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET user_id=EXCLUDED.user_id,
      session_id=EXCLUDED.session_id,expo_token=EXCLUDED.expo_token,platform=EXCLUDED.platform,
      registered_at=CASE WHEN native_installations.user_id=EXCLUDED.user_id THEN native_installations.registered_at ELSE NOW() END,
      enabled=TRUE,updated_at=NOW() WHERE native_installations.secret_hash=EXCLUDED.secret_hash RETURNING id`,
      [input.installation_id,digest(input.installation_secret),session.userId,session.sessionId,input.expo_token,input.platform]);
    if (!result.rowCount) return errorResponse("Installation could not be registered.",undefined,409);
  } catch (e) { if ((e as {code?:string}).code === "23505") return errorResponse("Installation could not be registered.",undefined,409); throw e; }
  return successResponse("Notifications registered.");
});
// Device capability permits removing registration even after the auth session expires.
export const DELETE = withApiRoute("/api/mobile/v1/installations", async (request: NextRequest) => {
  const parsed = await parseJsonRequest(request, installationIdentitySchema);
  if (!parsed.success) return parsed.response;
  await query("DELETE FROM native_installations WHERE id=$1 AND secret_hash=$2",[parsed.data.installation_id,digest(parsed.data.installation_secret)]);
  return successResponse("Notifications unregistered.");
});
