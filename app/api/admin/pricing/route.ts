import { getSession } from "@/lib/auth/session";
import { getPricingRules, updateFlatFee } from "@/lib/services/admin";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { NextRequest } from "next/server";

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

    const body = await req.json();
    const { rule_id, flat_fee } = body;

    if (!rule_id || flat_fee === undefined) {
      return errorResponse("rule_id and flat_fee are required.", undefined, 422);
    }
    if (typeof flat_fee !== "number" || flat_fee < 0) {
      return errorResponse("flat_fee must be a non-negative number.", undefined, 422);
    }

    await updateFlatFee(Number(rule_id), flat_fee);
    return successResponse("Flat fee updated.");
  } catch (error) {
    console.error("[PATCH /api/admin/pricing]", error);
    return serverErrorResponse();
  }
}
