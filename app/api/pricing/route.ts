import { query } from "@/lib/db/server";
import { successResponse, serverErrorResponse } from "@/lib/api/response";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const result = await query<{ flat_fee: string; currency: string }>("SELECT flat_fee, currency FROM pricing_rules WHERE is_active=TRUE ORDER BY id ASC LIMIT 1");
    if (!result.rows[0]) return serverErrorResponse("Pricing is temporarily unavailable.");
    return successResponse("Current delivery fee.", { amount: Number(result.rows[0].flat_fee), currency: result.rows[0].currency });
  } catch { return serverErrorResponse("Pricing is temporarily unavailable."); }
}
