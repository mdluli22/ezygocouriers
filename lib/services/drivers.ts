import { defaultPage, pageWhere, pageResult, type PageQuery } from "@/lib/api/pagination";
import { BusinessError } from "@/lib/api/errors";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { enqueueNotification } from "./notification-outbox";
import { verifyRouteDistance } from "@/lib/earnings/route-distance";
import { recordCompletion } from "@/lib/earnings/service";
import { deliveryPayCents } from "@/lib/earnings/calculation";
import { query, getClient } from "@/lib/db/server";
import {
  DeliveryStatus,
  STATUS_LABELS,
  isValidTransition,
} from "@ezygo/contracts";
import { autoAssignNextPaidDeliveryToDriver } from "./driver-assignment";
import { isDeliveryPinFormat, verifyDeliveryPin } from "@/lib/delivery-pin";
import { sendPushToUser } from "@/lib/services/push-notifications";

/**
 * Get all deliveries assigned to a driver (via their user ID).
 */
export async function getDriverDeliveries(driverUserId: number, page: PageQuery = defaultPage) {
  const params: unknown[] = [driverUserId];
  const extra = pageWhere(page, params, "d.id", "concat_ws(' ',d.tracking_number,d.recipient_name,pa.street_address,pa.city,da.street_address,da.city)", "d.status");
  params.push(page.limit + 1);
  const result = await query<{ id: number; [key: string]: unknown }>(
    `SELECT
       d.id,
       d.tracking_number,
       d.status,
       d.recipient_name,
       d.recipient_phone,
       d.pickup_contact_name,
       d.pickup_contact_phone,
       d.parcel_description,
       d.special_instructions,
       d.package_type,
       d.package_category,
       d.fragile,
       d.require_pin,
       d.scheduled_time,
       d.created_at,
       d.updated_at,
       COALESCE(e.distance_meters,d.route_distance_meters) AS distance_meters,
       e.amount_cents AS earning_cents,
       e.completed_at,
       pa.street_address  AS pickup_street,
       pa.suburb          AS pickup_suburb,
       pa.city            AS pickup_city,
       pa.province        AS pickup_province,
       da.street_address  AS dropoff_street,
       da.suburb          AS dropoff_suburb,
       da.city            AS dropoff_city,
       da.province        AS dropoff_province,
       q.amount           AS quote_amount,
       q.currency         AS quote_currency
     FROM deliveries d
     LEFT JOIN driver_delivery_earnings e ON e.delivery_id=d.id
     JOIN drivers dr   ON dr.id = d.assigned_driver_id
     JOIN addresses pa ON pa.id = d.pickup_address_id
     JOIN addresses da ON da.id = d.dropoff_address_id
     LEFT JOIN quotes q ON q.id = d.quote_id
     WHERE dr.user_id = $1 ${extra}
     ORDER BY d.id DESC LIMIT $${params.length}`,
    params
  );
  return pageResult(result.rows.map(row => ({...row, estimated_earning_cents: deliveryPayCents(row.distance_meters as number | null)})), page);
}

/**
 * Get a single delivery assigned to a driver with full detail.
 * Enforces that the delivery belongs to this driver.
 */
export async function getDriverDeliveryById(
  deliveryId: number,
  driverUserId: number
) {
  const result = await query(
    `SELECT
       d.id,d.customer_id,d.assigned_driver_id,d.pickup_address_id,d.dropoff_address_id,d.quote_id,
       d.pickup_contact_name,d.pickup_contact_phone,d.recipient_name,d.recipient_phone,d.recipient_email,
       d.parcel_description,d.special_instructions,d.tracking_number,d.status,d.created_at,d.updated_at,
       d.package_type,d.package_category,d.fragile,d.require_pin,d.scheduled_time,d.delivery_pin_sent_at,d.pin_verified_at,
       COALESCE(e.distance_meters,d.route_distance_meters) AS distance_meters,
       e.amount_cents AS earning_cents,
       e.completed_at,
       pa.street_address  AS pickup_street,
       pa.suburb          AS pickup_suburb,
       pa.city            AS pickup_city,
       pa.province        AS pickup_province,
       pa.postal_code     AS pickup_postal_code,
       pa.notes           AS pickup_notes,
       da.street_address  AS dropoff_street,
       da.suburb          AS dropoff_suburb,
       da.city            AS dropoff_city,
       da.province        AS dropoff_province,
       da.postal_code     AS dropoff_postal_code,
       da.notes           AS dropoff_notes,
       q.amount           AS quote_amount,
       q.currency         AS quote_currency,
       cu.full_name       AS customer_name,
       cu.phone           AS customer_phone
     FROM deliveries d
     LEFT JOIN driver_delivery_earnings e ON e.delivery_id=d.id
     JOIN drivers dr   ON dr.id = d.assigned_driver_id
     JOIN addresses pa ON pa.id = d.pickup_address_id
     JOIN addresses da ON da.id = d.dropoff_address_id
     LEFT JOIN quotes q  ON q.id = d.quote_id
     LEFT JOIN users cu  ON cu.id = d.customer_id
     WHERE d.id = $1 AND dr.user_id = $2
     LIMIT 1`,
    [deliveryId, driverUserId]
  );
  const row=result.rows[0];
  return row ? {...row,estimated_earning_cents:deliveryPayCents(row.distance_meters)} : null;
}

/**
 * Update delivery status as a driver.
 * Enforces ownership and valid status transitions.
 */
export async function updateDeliveryStatus(
  deliveryId: number,
  driverUserId: number,
  newStatus: DeliveryStatus,
  note?: string,
  pin?: string
): Promise<void> {
  await consumeRateLimit(`driver-status:${driverUserId}`,60,60);
  if (newStatus === "delivered") await consumeRateLimit(`delivery-pin:${deliveryId}:${driverUserId}`,5,300);
  let meters: number | null = null;
  if (newStatus === "delivered") {
    const assigned = await query("SELECT d.id FROM deliveries d JOIN drivers dr ON dr.id=d.assigned_driver_id WHERE d.id=$1 AND dr.user_id=$2",[deliveryId,driverUserId]);
    if (!assigned.rowCount) throw new BusinessError("Delivery not found or not assigned to you.");
    meters = await verifyRouteDistance(deliveryId);
  }
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const check = await client.query<{
      status: string;
      id: number;
      driver_id: number;
      require_pin: boolean;
      delivery_pin_hash: string | null;
      tracking_number: string;
      recipient_name: string;
      customer_email: string;
      customer_name: string;
      customer_id: number;
    }>(
      `SELECT d.id, d.status, d.require_pin, d.delivery_pin_hash,
              d.tracking_number, d.recipient_name, dr.id AS driver_id,
              cu.email AS customer_email, cu.full_name AS customer_name,
              cu.id AS customer_id
       FROM deliveries d
       JOIN drivers dr ON dr.id = d.assigned_driver_id
       JOIN users cu ON cu.id = d.customer_id
       WHERE d.id = $1 AND dr.user_id = $2 AND dr.status = 'active'
       FOR UPDATE`,
      [deliveryId, driverUserId]
    );

    const delivery = check.rows[0];
    if (!delivery) throw new BusinessError("Delivery not found or not assigned to you.");
    if (newStatus !== "cancelled") {
      const settled = await client.query("SELECT id FROM payments WHERE delivery_id=$1 AND status='complete'", [deliveryId]);
      if (!settled.rowCount) throw new BusinessError("A verified payment is required before fulfilment.");
    }
    if (!isValidTransition(delivery.status as DeliveryStatus, newStatus)) {
      throw new BusinessError(`Cannot transition from '${delivery.status}' to '${newStatus}'.`);
    }

    let pinVerified = false;
    if (newStatus === "delivered" && delivery.require_pin) {
      if (!delivery.delivery_pin_hash) {
        throw new BusinessError("Delivery PIN has not been issued to the recipient yet.");
      }
      if (!pin || !isDeliveryPinFormat(pin)) {
        throw new BusinessError("Enter the recipient's six-digit delivery PIN.");
      }
      pinVerified = await verifyDeliveryPin(pin, delivery.delivery_pin_hash);
      if (!pinVerified) throw new BusinessError("Incorrect delivery PIN. Ask the recipient to check their email.");
    }

    await client.query(
      `UPDATE deliveries
       SET status = $1,
           pin_verified_at = CASE WHEN $3 THEN NOW() ELSE pin_verified_at END,
           updated_at = NOW()
       WHERE id = $2`,
      [newStatus, deliveryId, pinVerified]
    );

    await client.query(
      `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [deliveryId, newStatus, note || null, driverUserId]
    );

    if (newStatus === "delivered") await recordCompletion(client,deliveryId,delivery.driver_id,meters);

    if (newStatus === "delivered") await enqueueNotification(client, {
      key:`completed:${deliveryId}`,kind:"completed_email",deliveryId,
      payload:{to:delivery.customer_email,customerName:delivery.customer_name,trackingNumber:delivery.tracking_number,recipientName:delivery.recipient_name}
    });
    if (newStatus === "cancelled") {
      const { queuePaymentReview } = await import("./payment-reviews");
      const paid = await client.query("SELECT id,provider_payment_id FROM payments WHERE delivery_id=$1 AND status='complete'", [deliveryId]);
      for (const payment of paid.rows) await queuePaymentReview(client,payment.id,payment.provider_payment_id || `legacy-${payment.id}`,"Driver cancelled a paid delivery");
    }
    await sendPushToUser(delivery.customer_id, {
      title: `Delivery ${STATUS_LABELS[newStatus].toLowerCase()}`,
      body: `${delivery.tracking_number} is now ${STATUS_LABELS[newStatus].toLowerCase()}.`,
      url: `/dashboard/tracking/${deliveryId}`,tag: `delivery-${deliveryId}`,
    },client);
    await client.query("COMMIT");

    if (["delivered", "failed", "cancelled"].includes(newStatus)) {
      try {
        await autoAssignNextPaidDeliveryToDriver(delivery.driver_id);
      } catch (error) {
        // The status update is complete; location heartbeats retry the queue.
        console.error("[Automatic delivery queue assignment]", {
          driverId: delivery.driver_id,
          error,
        });
      }
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
