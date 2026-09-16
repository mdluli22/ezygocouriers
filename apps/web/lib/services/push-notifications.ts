import webPush from "web-push";
import { query } from "@/lib/db/server";
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
  await query(
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

export async function sendPushToUser(
  userId: number,
  message: PushMessage
): Promise<void> {
  if (!configureWebPush()) return;

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

  await Promise.allSettled(
    result.rows.map(async (row) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(message),
          { TTL: 60 * 60, urgency: "high" }
        );
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
        console.error("[Web push] Delivery failed", {
          userId,
          statusCode,
        });
      }
    })
  );
}

export async function notifyAssignedDriver(params: {
  driverId: number;
  deliveryId: number;
}): Promise<void> {
  const result = await query<{
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

  await Promise.all([
    sendPushToUser(target.user_id, {
      title: "New delivery assigned",
      body: `${target.tracking_number} is ready for pickup.`,
      url: `/driver/deliveries/${params.deliveryId}`,
      tag: `assignment-${params.deliveryId}`,
    }),
    sendPushToUser(target.customer_id, {
      title: "Driver assigned",
      body: `${target.driver_name} has been assigned to ${target.tracking_number}.`,
      url: `/dashboard/tracking/${params.deliveryId}`,
      tag: `delivery-${params.deliveryId}`,
    }),
  ]);
}
