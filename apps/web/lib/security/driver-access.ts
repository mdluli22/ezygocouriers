import { query } from "@/lib/db/server";

export async function driverIsActive(userId: number): Promise<boolean> {
  const result = await query("SELECT id FROM drivers WHERE user_id=$1 AND status='active'", [userId]);
  return result.rows.length === 1;
}
