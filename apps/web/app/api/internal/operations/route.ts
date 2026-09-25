import { withApiRoute } from "@/lib/api/route";
import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { processNativeOperations } from "@/lib/services/native-push";
export const POST = withApiRoute("/api/internal/operations", async (req: NextRequest) => {
  const expected = process.env.OPERATIONS_WORKER_SECRET;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))) return Response.json({ error: "Unauthorized" },{status:401});
  await processNativeOperations();
  return Response.json({ ok: true });
});
