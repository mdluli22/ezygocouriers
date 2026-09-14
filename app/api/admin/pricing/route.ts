import { getSession } from "@/lib/auth/session";
import { getPricingRules, updateFlatFee } from "@/lib/services/admin";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { NextRequest } from "next/server";
import { adminUpdatePricingSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const rules = await getPricingRules();
    return successResponse("Pricing rules fetched.", rules);
  } catch (error) {
    console.error("[GET /api/admin/pricing]", error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = await parseJsonRequest(req, adminUpdatePricingSchema);
    if (!parsed.success) return parsed.response;
    const { rule_id, flat_fee } = parsed.data;

    await updateFlatFee(rule_id, flat_fee);
    return successResponse("Flat fee updated.");
  } catch (error) {
    console.error("[PATCH /api/admin/pricing]", error);
    return serverErrorResponse();
  }
}
