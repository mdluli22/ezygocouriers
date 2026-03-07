import { query, getClient } from "@/lib/db/server";
import {
  DeliveryStatus,
  isValidTransition,
} from "@/lib/auth/delivery-status";

/**
 * Get all deliveries assigned to a driver (via their user ID).
 */
export async function getDriverDeliveries(driverUserId: number) {
  const result = await query(
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
       d.created_at,
       d.updated_at,
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
     JOIN drivers dr   ON dr.id = d.assigned_driver_id
     JOIN addresses pa ON pa.id = d.pickup_address_id
     JOIN addresses da ON da.id = d.dropoff_address_id
     LEFT JOIN quotes q ON q.id = d.quote_id
     WHERE dr.user_id = $1
     ORDER BY d.updated_at DESC`,
    [driverUserId]
  );
  return result.rows;
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
       d.*,
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
     JOIN drivers dr   ON dr.id = d.assigned_driver_id
     JOIN addresses pa ON pa.id = d.pickup_address_id
     JOIN addresses da ON da.id = d.dropoff_address_id
     LEFT JOIN quotes q  ON q.id = d.quote_id
     LEFT JOIN users cu  ON cu.id = d.customer_id
     WHERE d.id = $1 AND dr.user_id = $2
     LIMIT 1`,
    [deliveryId, driverUserId]
  );
  return result.rows[0] ?? null;
}

/**
 * Update delivery status as a driver.
 * Enforces ownership and valid status transitions.
 */
export async function updateDeliveryStatus(
  deliveryId: number,
  driverUserId: number,
  newStatus: DeliveryStatus,
  note?: string
): Promise<void> {
  // 1. Verify driver owns this delivery
  const check = await query<{ status: string; id: number }>(
    `SELECT d.id, d.status
     FROM deliveries d
     JOIN drivers dr ON dr.id = d.assigned_driver_id
     WHERE d.id = $1 AND dr.user_id = $2
     LIMIT 1`,
    [deliveryId, driverUserId]
  );

  const delivery = check.rows[0];
  if (!delivery) throw new Error("Delivery not found or not assigned to you.");

  // 2. Validate transition
  if (!isValidTransition(delivery.status as DeliveryStatus, newStatus)) {
    throw new Error(
      `Cannot transition from '${delivery.status}' to '${newStatus}'.`
    );
  }

  // 3. Get driver record ID for the log
  const driverResult = await query<{ id: number }>(
    `SELECT id FROM drivers WHERE user_id = $1 LIMIT 1`,
    [driverUserId]
  );
  const driverUsersId = driverResult.rows[0]?.id;

  const client = await getClient();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE deliveries SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, deliveryId]
    );

    await client.query(
      `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [deliveryId, newStatus, note || null, driverUsersId]
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
