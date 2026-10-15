import { createHash } from "node:crypto";
import { BusinessError } from "@/lib/api/errors";
import { resolvePushAddress, pinnedPushAgent } from "@/lib/security/push-endpoint";
import { enqueueNotification, enqueueDeliveryUpdate } from "./notification-outbox";
import webPush from "web-push";
import { query, getClient } from "@/lib/db/server";
import type { PushSubscriptionInput } from "@ezygo/contracts";

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

function pushIsConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function configureWebPush(): boolean {
  if (!pushIsConfigured()) return false;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return true;
}

export function getPushPublicConfig() {
  return {
    enabled: pushIsConfigured(),
    publicKey: pushIsConfigured()
      ? process.env.VAPID_PUBLIC_KEY!
      : null,
  };
}

export async function savePushSubscription(
  userId: number,
  subscription: PushSubscriptionInput
): Promise<void> {
  try { await resolvePushAddress(subscription.endpoint); } catch { throw new BusinessError("Unsupported push endpoint.",422); }
  const publicKey = Buffer.from(subscription.keys.p256dh,"base64url"), authKey = Buffer.from(subscription.keys.auth,"base64url");
  if (publicKey.length !== 65 || publicKey[0] !== 4 || authKey.length !== 16) throw new BusinessError("Invalid push subscription keys.",422);
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(921,$1)",[userId]);
    const count = await client.query("SELECT COUNT(*)::int AS count FROM push_subscriptions WHERE user_id=$1 AND endpoint<>$2",[userId,subscription.endpoint]);
    if (count.rows[0].count >= 10) throw new BusinessError("Too many notification devices. Remove an old device first.",422);
  await client.query(
    `INSERT INTO push_subscriptions
       (user_id, endpoint, p256dh, auth, expiration_time)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           expiration_time = EXCLUDED.expiration_time,
           updated_at = NOW()`,
    [
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      subscription.expirationTime ?? null,
    ]
  );
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

}

export async function removePushSubscription(
  userId: number,
  endpoint: string
): Promise<void> {
  await query(
    "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
    [userId, endpoint]
  );
}

export async function sendPushToUser(userId: number, message: PushMessage, db: {query: typeof query} = {query}): Promise<void> {
  if (!pushIsConfigured()) return;
  const digest=createHash("sha256").update(JSON.stringify(message)).digest("hex");
  await enqueueNotification(db,{key:`push:${userId}:${digest}`,kind:"push",payload:{userId,message}});
}

export async function deliverPushToUser(
  userId: number,
  message: PushMessage
): Promise<void> {
  if (!configureWebPush()) throw new Error("Push is not configured.");

  const result = await query<{
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `SELECT endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id = $1`,
    [userId]
  );

  const sent = await Promise.allSettled(
    result.rows.map(async (row) => {
      try {
        const address = await resolvePushAddress(row.endpoint);
        const agent = pinnedPushAgent(address);
        try { await webPush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(message),
          { TTL: 60 * 60, urgency: "high", timeout: 10000, agent }
        ); } finally { agent.destroy(); }
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number(error.statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await query("DELETE FROM push_subscriptions WHERE endpoint = $1", [
            row.endpoint,
          ]);
          return;
        }
        throw new Error(`Push provider failure (${statusCode})`);
      }
    })
  );
  if (sent.some(result=>result.status === "rejected")) throw new Error("Some push notifications need retrying.");
}

export async function notifyAssignedDriver(params: {
  driverId: number;
  deliveryId: number;
}, db: {query: typeof query} = {query}): Promise<void> {
  const result = await db.query<{
    user_id: number;
    customer_id: number;
    tracking_number: string;
    driver_name: string;
  }>(
    `SELECT dr.user_id, d.customer_id, d.tracking_number,
            driver_user.full_name AS driver_name
     FROM drivers dr
     JOIN users driver_user ON driver_user.id = dr.user_id
     JOIN deliveries d ON d.id = $2
     WHERE dr.id = $1`,
    [params.driverId, params.deliveryId]
  );
  const target = result.rows[0];
  if (!target) return;

  await enqueueDeliveryUpdate(db,params.deliveryId,"assigned_email");

  await Promise.all([
    sendPushToUser(target.user_id, {
      title: "New delivery assigned",
      body: `${target.tracking_number} is ready for pickup.`,
      url: `/driver/deliveries/${params.deliveryId}`,
      tag: `assignment-${params.deliveryId}`,
    },db),
    sendPushToUser(target.customer_id, {
      title: "Driver assigned",
      body: `${target.driver_name} has been assigned to ${target.tracking_number}.`,
      url: `/dashboard/tracking/${params.deliveryId}`,
      tag: `delivery-${params.deliveryId}`,
    },db),
  ]);
}
