import { BusinessError } from "@/lib/api/errors";
import { randomUUID } from "node:crypto";
import { query, getClient } from "@/lib/db/server";
import { encryptPayload, decryptPayload } from "@/lib/security/encryption";
import { generateDeliveryPin, hashDeliveryPin } from "@/lib/delivery-pin";
import { sendDeliveryPin, sendDeliveryCompleted } from "@/lib/email/smtp";

type Executor = {query: typeof query};
export async function enqueueNotification(db: Executor, job: { key: string; kind: "pin_email" | "completed_email" | "push"; deliveryId?: number; payload: unknown }) {
  await db.query(`INSERT INTO notification_outbox(dedupe_key,kind,delivery_id,encrypted_payload)
    VALUES ($1,$2,$3,$4) ON CONFLICT(dedupe_key) DO NOTHING`,
    [job.key,job.kind,job.deliveryId ?? null,encryptPayload(job.payload)]);
}

/** Caller locks the delivery in its transaction. Replayed payments never rotate a PIN. */
export async function enqueueRecipientPin(db: Executor, deliveryId: number, rotate = false) {
  const result = await db.query(`SELECT require_pin,delivery_pin_hash,recipient_email,recipient_name,tracking_number,status
    FROM deliveries WHERE id=$1 FOR UPDATE`, [deliveryId]);
  const d = result.rows[0];
  if (!d?.require_pin || ["cancelled","failed","delivered"].includes(d.status)) return;
  if (d.delivery_pin_hash && !rotate) return;
  if (!d.recipient_email) throw new BusinessError("Recipient email is required for a delivery PIN.");
  const pin = generateDeliveryPin(), hash = await hashDeliveryPin(pin);
  await db.query("UPDATE notification_outbox SET status='cancelled',encrypted_payload=NULL WHERE delivery_id=$1 AND kind='pin_email' AND status IN ('pending','failed')", [deliveryId]);
  await db.query("UPDATE deliveries SET delivery_pin_hash=$2,delivery_pin_sent_at=NULL,pin_verified_at=NULL WHERE id=$1", [deliveryId,hash]);
  await enqueueNotification(db, { key: `pin:${deliveryId}:${hash}`, kind: "pin_email", deliveryId,
    payload: { to: d.recipient_email, recipientName: d.recipient_name, trackingNumber: d.tracking_number, pin, hash } });
}

interface Job { id: number; kind: string; delivery_id: number; encrypted_payload: string; attempts: number; lease_token: string }

/** Leases make worker crashes recoverable. Notification delivery is at least once. */
export async function processNotificationOutbox(limit = 10): Promise<number> {
  const lease = randomUUID();
  const jobs = await query<Job>(`WITH due AS (
    SELECT id FROM notification_outbox WHERE
      (status='pending' AND available_at<=NOW()) OR (status='processing' AND locked_at<NOW()-INTERVAL '5 minutes')
    ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED)
    UPDATE notification_outbox n SET status='processing',locked_at=NOW(),lease_token=$2,attempts=attempts+1
    FROM due WHERE n.id=due.id RETURNING n.*`, [limit,lease]);
  for (const job of jobs.rows) {
    try {
      if (job.kind === "pin_email") {
        const payload = decryptPayload<Parameters<typeof sendDeliveryPin>[0] & {hash: string}>(job.encrypted_payload);
        const client = await getClient();
        try {
          await client.query("BEGIN");
          // Serializes resend/cancellation against a send so an old PIN cannot win.
          const d = await client.query("SELECT delivery_pin_hash,status FROM deliveries WHERE id=$1 FOR UPDATE", [job.delivery_id]);
          if (d.rows[0]?.delivery_pin_hash !== payload.hash || ["cancelled","failed","delivered"].includes(d.rows[0]?.status)) {
            await client.query("UPDATE notification_outbox SET status='cancelled',encrypted_payload=NULL WHERE id=$1 AND lease_token=$2", [job.id,lease]);
          } else {
            await sendDeliveryPin(payload);
            await client.query("UPDATE deliveries SET delivery_pin_sent_at=NOW() WHERE id=$1 AND delivery_pin_hash=$2", [job.delivery_id,payload.hash]);
            await markSent(client,job.id,lease);
          }
          await client.query("COMMIT");
        } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
      } else {
        if (job.kind === "completed_email") {
          await sendDeliveryCompleted(decryptPayload(job.encrypted_payload));
          await query("UPDATE deliveries SET delivery_completed_email_sent_at=NOW() WHERE id=$1", [job.delivery_id]);
        } else {
          const { deliverPushToUser } = await import("./push-notifications");
          const payload = decryptPayload<{ userId: number; message: import("./push-notifications").PushMessage }>(job.encrypted_payload);
          await deliverPushToUser(payload.userId,payload.message);
        }
        await markSent({query},job.id,lease);
      }
    } catch {
      // Do not log payloads, recipient addresses, PINs or SMTP credential errors.
      await query(`UPDATE notification_outbox SET status=CASE WHEN attempts>=8 THEN 'failed' ELSE 'pending' END,
        available_at=NOW()+LEAST(3600,30*POWER(2,LEAST(attempts,7))) * INTERVAL '1 second',
        last_error='Notification provider unavailable',locked_at=NULL WHERE id=$1 AND lease_token=$2`, [job.id,lease]);
    }
  }
  await query("DELETE FROM request_rate_limits WHERE expires_at<NOW()-INTERVAL '1 day'");
  return jobs.rows.length;
}

async function markSent(db: Executor, id: number, lease: string) {
  await db.query("UPDATE notification_outbox SET status='sent',sent_at=NOW(),encrypted_payload=NULL,last_error=NULL WHERE id=$1 AND lease_token=$2", [id,lease]);
}

export async function recoverRecipientPin(deliveryId: number, actorId: number, admin: boolean) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT customer_id,status,require_pin FROM deliveries WHERE id=$1 FOR UPDATE", [deliveryId]);
    const d = result.rows[0];
    if (!d || (!admin && d.customer_id !== actorId)) throw new BusinessError("Delivery not found.");
    if (!d.require_pin) throw new BusinessError("This delivery does not require a PIN.");
    if (!["paid","assigned","picked_up","in_transit"].includes(d.status)) throw new BusinessError("A PIN cannot be sent for this delivery status.");
    await enqueueRecipientPin(client,deliveryId,true);
    await client.query("INSERT INTO delivery_status_logs(delivery_id,status,note,updated_by) VALUES ($1,$2,'Recipient PIN resend requested',$3)", [deliveryId,d.status,actorId]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
