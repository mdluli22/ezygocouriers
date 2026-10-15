import { NextRequest } from "next/server";
import { parseQuery } from "@/lib/api/validation";
import { pageSchema, paginatedResponse } from "@/lib/api/pagination";
import { getSession } from "@/lib/auth/session";
import { getDriverDeliveries } from "@/lib/services/drivers";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const page = parseQuery(req.nextUrl.searchParams, pageSchema);
    if (!page.success) return page.response;
    const deliveries = await getDriverDeliveries(session.userId, page.data);
    return paginatedResponse("Deliveries fetched.", deliveries);
  } catch (error) {
    console.error("[GET /api/driver/deliveries]", error);
    return serverErrorResponse();
  }
}
