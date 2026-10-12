import { API_CONTRACT_VERSION, API_CONTRACT_VERSION_HEADER } from "@ezygo/contracts/constants";
import { z } from "zod";
import { NextResponse } from "next/server";
export const pageSchema = z.object({
  cursor: z.coerce.number().int().positive().max(2147483647).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).default(""),
  view: z.enum(["all", "active", "history"]).default("all"),
});
export type PageQuery = z.infer<typeof pageSchema>;
export const defaultPage: PageQuery = { limit: 25, q: "", view: "all" };
export function pageResult<T extends { id: number }>(rows: T[], page: PageQuery) {
  const more = rows.length > page.limit;
  const data = rows.slice(0, page.limit);
  return { data, pagination: { nextCursor: more ? data.at(-1)!.id : null, limit: page.limit } };
}
export function paginatedResponse<T>(message: string, result: { data: T; pagination: unknown }) {
  return NextResponse.json({ success: true, message, ...result }, { headers: { [API_CONTRACT_VERSION_HEADER]: API_CONTRACT_VERSION, "Cache-Control": "no-store", Vary: "Cookie, Authorization" } });
}
// Parameters only; column expressions come from application code, never a request.
export function pageWhere(page: PageQuery, params: unknown[], id: string, search: string, status?: string) {
  const clauses: string[] = [];
  if (page.cursor) { params.push(page.cursor); clauses.push(`${id} < $${params.length}`); }
  if (page.q) { params.push(`%${page.q.replace(/[\\%_]/g, "\\$&")}%`); clauses.push(`${search} ILIKE $${params.length}`); }
  if (status && page.view !== "all") clauses.push(`${status} ${page.view === "active" ? "NOT " : ""}IN ('delivered','failed','cancelled')`);
  return clauses.length ? " AND " + clauses.join(" AND ") : "";
}
