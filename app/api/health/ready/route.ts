import { NextResponse } from "next/server";
import pool from "@/lib/db/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await pool.query({ text: "SELECT id FROM pricing_rules LIMIT 1" });
    await pool.query({ text: "SELECT id FROM auth_sessions LIMIT 0" });
    await pool.query({ text: "SELECT id FROM notification_outbox LIMIT 0" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
