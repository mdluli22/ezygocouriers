import { getClient } from "@/lib/db/server";
const messages: Record<string, string> = { confirmed: "Payment action required", paid: "Payment confirmed", assigned: "Driver assigned", picked_up: "Pickup confirmed", delivered: "Delivery completed", failed: "Delivery could not be completed" };
async function expo(path: string, body: unknown) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Push service unavailable");
  return response.json();
}
/** Single worker lease; events are committed atomically by the delivery trigger. */
export async function processNativeOperations() {
  const db = await getClient();
  try {
    const lock = await db.query("SELECT pg_try_advisory_lock(603015) AS acquired");
    if (!lock.rows[0].acquired) return;
    await db.query(`DELETE FROM native_push_events WHERE created_at < NOW()-INTERVAL '24 hours'`);
    await db.query(`DELETE FROM native_installations i WHERE NOT EXISTS (SELECT 1 FROM auth_sessions s WHERE s.id=i.session_id AND s.expires_at>NOW())`);
    await db.query(`UPDATE drivers SET current_latitude=NULL,current_longitude=NULL,location_updated_at=NULL,location_accuracy=NULL,location_delivery_id=NULL,location_session_id=NULL,location_received_at=NULL WHERE location_updated_at < NOW()-INTERVAL '5 minutes' OR (location_session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_sessions s WHERE s.id=drivers.location_session_id AND s.expires_at>NOW()))`);
    await db.query(`INSERT INTO native_push_jobs(event_id,installation_id) SELECT e.id,i.id FROM native_push_events e JOIN native_installations i ON i.user_id=e.user_id AND i.enabled AND i.registered_at<=e.created_at ON CONFLICT DO NOTHING`);
    const jobs = await db.query(`SELECT j.*,i.expo_token,e.delivery_id,e.audience,e.kind FROM native_push_jobs j JOIN native_push_events e ON e.id=j.event_id JOIN native_installations i ON i.id=j.installation_id AND i.user_id=e.user_id JOIN auth_sessions s ON s.id=i.session_id AND s.expires_at>NOW() JOIN users u ON u.id=i.user_id AND u.is_active=TRUE WHERE i.enabled AND j.status IN ('pending','ticket') AND j.next_attempt_at<=NOW() AND j.attempts<8 ORDER BY j.id LIMIT 50`);
    for (const job of jobs.rows) {
      // Persist the retry delay before external I/O to avoid a hot retry after a crash.
      await db.query("UPDATE native_push_jobs SET attempts=attempts+1,next_attempt_at=NOW()+INTERVAL '2 minutes' WHERE id=$1",[job.id]);
      try {
        if (job.status === "ticket") {
          const result = await expo("getReceipts", { ids: [job.ticket_id] });
          const receipt = result.data?.[job.ticket_id];
          if (!receipt) continue;
          if (receipt.details?.error === "DeviceNotRegistered") await db.query("UPDATE native_installations SET enabled=FALSE WHERE id=$1 AND expo_token=$2",[job.installation_id,job.sent_token]);
          await db.query("UPDATE native_push_jobs SET status=$2 WHERE id=$1",[job.id,receipt.status === "ok" ? "delivered" : "failed"]);
        } else {
          const current = await db.query(`SELECT i.id FROM native_installations i JOIN auth_sessions s ON s.id=i.session_id AND s.expires_at>NOW() JOIN native_push_events e ON e.id=$2 AND e.user_id=i.user_id WHERE i.id=$1 AND i.enabled AND i.expo_token=$3`,[job.installation_id,job.event_id,job.expo_token]);
          if (!current.rowCount) continue;
          const result = await expo("send", [{ to: job.expo_token, title: job.audience === "driver" ? "New delivery assignment" : messages[job.kind], body: "Open EzyGo for details.", sound: "default", channelId: "deliveries", data: { delivery_id: Number(job.delivery_id), audience: job.audience, event_id: String(job.event_id) } }]);
          const ticket = result.data?.[0];
          if (ticket?.details?.error === "DeviceNotRegistered") await db.query("UPDATE native_installations SET enabled=FALSE WHERE id=$1 AND expo_token=$2",[job.installation_id,job.expo_token]);
          if (ticket?.status === "ok" && ticket.id) await db.query("UPDATE native_push_jobs SET status='ticket',ticket_id=$2,sent_token=$3,attempts=0 WHERE id=$1",[job.id,ticket.id,job.expo_token]);
          else if (ticket?.details?.error === "DeviceNotRegistered") await db.query("UPDATE native_push_jobs SET status='failed' WHERE id=$1",[job.id]);
        }
      } catch { /* Durable retry; never log device tokens. */ }
    }
  } finally { try { await db.query("SELECT pg_advisory_unlock(603015)"); } finally { db.release(); } }
}
