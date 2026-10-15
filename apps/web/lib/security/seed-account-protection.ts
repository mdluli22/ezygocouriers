import { createHash } from "node:crypto";
import { query } from "@/lib/db/server";
const SEED_HASH_FINGERPRINTS = new Set(['c5477d8b61e21aacbc93dae2959fa14fd0790ba6da4789a10fd7d1a4b7b95d67', '6c325c7b2b494551c15834dbf3fe82ab38646149b453d1e295b1f4481d4762ce', '71654151de94286b9040994fdb5f4ee63ab798114f7a64350c3dd51adf0c3df3']);
export function isKnownSeedHash(hash: string): boolean {
  return SEED_HASH_FINGERPRINTS.has(createHash("sha256").update(hash).digest("hex"));
}
/** Development fixtures are allowed locally, never in a production runtime. */
export async function productionAccountAllowed(userId: number): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  const result = await query<{password:string|null}>(`SELECT COALESCE(a.password,u.password_hash) AS password
    FROM users u LEFT JOIN auth_accounts a ON a.user_id=u.id AND a.provider_id='credential'
    WHERE u.id=$1`,[userId]);
  return result.rows.length>0 && result.rows.every(row=>!row.password || !isKnownSeedHash(row.password));
}
