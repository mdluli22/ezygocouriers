import { query } from "@/lib/db/server";
import type { UserAnalytics } from "@/lib/analytics";

export async function recordPresence(sessionId: string, userId: number) {
  // Database time is authoritative. Only the validated session's owner can write.
  // Repeated requests within a minute do not cause additional updates.
  await query(`INSERT INTO auth_session_presence (session_id, last_seen_at)
    SELECT id, NOW() FROM auth_sessions WHERE id = $1 AND user_id = $2 AND expires_at > NOW()
    ON CONFLICT (session_id) DO UPDATE SET last_seen_at = NOW()
    WHERE auth_session_presence.last_seen_at < NOW() - INTERVAL '55 seconds'`, [sessionId, userId]);
}

export async function getUserAnalytics(): Promise<UserAnalytics> {
  const [users, presence, trend] = await Promise.all([
    query<Omit<UserAnalytics, "live" | "trend" | "updatedAt">>(`SELECT COUNT(*)::int AS registered,
      COUNT(*) FILTER (WHERE role = 'customer')::int AS customers,
      COUNT(*) FILTER (WHERE role = 'driver')::int AS drivers,
      COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
      COUNT(*) FILTER (WHERE is_active)::int AS enabled,
      COUNT(*) FILTER (WHERE email_verified)::int AS verified,
      COUNT(*) FILTER (WHERE NOT email_verified)::int AS unverified,
      COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Johannesburg') AT TIME ZONE 'Africa/Johannesburg')::int AS today,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS "last7Days",
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS "last30Days"
      FROM users`),
    query<{ live: number }>(`SELECT COUNT(DISTINCT s.user_id)::int AS live
      FROM auth_session_presence p JOIN auth_sessions s ON s.id = p.session_id
      JOIN users u ON u.id = s.user_id
      WHERE p.last_seen_at > NOW() - INTERVAL '2 minutes'
        AND s.expires_at > NOW() AND u.is_active AND u.email_verified
        AND (u.role <> 'driver' OR EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id AND d.status = 'active'))`),
    query<{ date: string; count: number }>(`WITH days AS (
      SELECT GENERATE_SERIES((NOW() AT TIME ZONE 'Africa/Johannesburg')::date - 13,
        (NOW() AT TIME ZONE 'Africa/Johannesburg')::date, INTERVAL '1 day')::date AS day
      ), registrations AS (
        SELECT (created_at AT TIME ZONE 'Africa/Johannesburg')::date AS day, COUNT(*)::int AS count
        FROM users WHERE created_at >= ((NOW() AT TIME ZONE 'Africa/Johannesburg')::date - 13) AT TIME ZONE 'Africa/Johannesburg'
        GROUP BY 1
      ) SELECT TO_CHAR(days.day, 'YYYY-MM-DD') AS date, COALESCE(registrations.count, 0)::int AS count
        FROM days LEFT JOIN registrations USING (day) ORDER BY days.day`),
  ]);
  return { ...users.rows[0], live: presence.rows[0].live, trend: trend.rows, updatedAt: new Date().toISOString() };
}
