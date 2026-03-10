import { query, getClient } from "@/lib/db/server";
import { DeliveryStatus } from "@/lib/constants/delivery-status";

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const [deliveries, drivers, users, revenue] = await Promise.all([
    query(`SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
              COUNT(*) FILTER (WHERE status = 'in_transit') AS in_transit,
              COUNT(*) FILTER (WHERE status = 'delivered')  AS delivered,
              COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled
           FROM deliveries`),
    query(`SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_active = true)  AS active,
              COUNT(*) FILTER (WHERE is_active = false) AS inactive
           FROM drivers`),
    query(`SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE role = 'customer') AS customers,
              COUNT(*) FILTER (WHERE role = 'driver')   AS drivers,
              COUNT(*) FILTER (WHERE is_active = true)  AS active
           FROM users`),
    query(`SELECT COALESCE(SUM(q.amount), 0) AS total_revenue
           FROM deliveries d
           JOIN quotes q ON q.id = d.quote_id
           WHERE d.status = 'delivered'`),
  ]);

  return {
    deliveries: deliveries.rows[0],
    drivers: drivers.rows[0],
    users: users.rows[0],
    revenue: revenue.rows[0],
  };
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export async function getAdminDeliveries(status?: DeliveryStatus | "all") {
  const filter = status && status !== "all" ? `WHERE d.status = '${status}'` : "";

  const result = await query(
    `SELECT
       d.id,
       d.tracking_number,
       d.status,
       d.recipient_name,
       d.recipient_phone,
       d.parcel_description,
       d.created_at,
       d.updated_at,
       pa.city            AS pickup_city,
       pa.province        AS pickup_province,
       da.city            AS dropoff_city,
       da.province        AS dropoff_province,
       q.amount           AS quote_amount,
       q.currency         AS quote_currency,
       cu.full_name       AS customer_name,
       cu.email           AS customer_email,
       dr_user.full_name  AS driver_name
     FROM deliveries d
     JOIN addresses pa  ON pa.id = d.pickup_address_id
     JOIN addresses da  ON da.id = d.dropoff_address_id
     LEFT JOIN quotes q         ON q.id  = d.quote_id
     LEFT JOIN users cu         ON cu.id = d.customer_id
     LEFT JOIN drivers dr       ON dr.id = d.assigned_driver_id
     LEFT JOIN users dr_user    ON dr_user.id = dr.user_id
     ${filter}
     ORDER BY d.created_at DESC`
  );
  return result.rows;
}

export async function assignDriver(
  deliveryId: number,
  driverId: number
): Promise<void> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE deliveries
       SET assigned_driver_id = $1, status = 'assigned', updated_at = NOW()
       WHERE id = $2`,
      [driverId, deliveryId]
    );

    await client.query(
      `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
       VALUES ($1, 'assigned', 'Driver assigned by admin', NULL)`,
      [deliveryId]
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getAdminDrivers() {
  const result = await query(
    `SELECT
       dr.id,
       dr.license_number,
       dr.vehicle_make,
       dr.vehicle_model,
       dr.vehicle_registration,
       dr.is_active,
       dr.created_at,
       u.id          AS user_id,
       u.full_name,
       u.email,
       u.phone,
       u.is_active   AS user_active,
       COUNT(d.id)   AS total_deliveries,
       COUNT(d.id) FILTER (WHERE d.status = 'delivered') AS completed_deliveries
     FROM drivers dr
     JOIN users u ON u.id = dr.user_id
     LEFT JOIN deliveries d ON d.assigned_driver_id = dr.id
     GROUP BY dr.id, u.id
     ORDER BY dr.created_at DESC`
  );
  return result.rows;
}

export async function createDriver(data: {
  full_name: string;
  email: string;
  phone?: string;
  password_hash: string;
  license_number: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_registration: string;
}): Promise<{ userId: number; driverId: number }> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const userResult = await client.query<{ id: number }>(
      `INSERT INTO users (full_name, email, phone, password_hash, auth_provider, role)
       VALUES ($1, $2, $3, $4, 'email', 'driver')
       RETURNING id`,
      [data.full_name, data.email, data.phone || null, data.password_hash]
    );
    const userId = userResult.rows[0].id;

    const driverResult = await client.query<{ id: number }>(
      `INSERT INTO drivers (user_id, license_number, vehicle_make, vehicle_model, vehicle_registration)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        userId,
        data.license_number,
        data.vehicle_make,
        data.vehicle_model,
        data.vehicle_registration,
      ]
    );
    const driverId = driverResult.rows[0].id;

    await client.query("COMMIT");
    return { userId, driverId };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function toggleDriverStatus(driverId: number): Promise<void> {
  await query(
    `UPDATE drivers SET is_active = NOT is_active WHERE id = $1`,
    [driverId]
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAdminUsers(role?: string) {
  const filter = role ? `WHERE role = '${role}'` : "";
  const result = await query(
    `SELECT id, full_name, email, phone, role, is_active, auth_provider, created_at
     FROM users
     ${filter}
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function toggleUserStatus(
  targetUserId: number,
  requestingUserId: number
): Promise<void> {
  if (targetUserId === requestingUserId) {
    throw new Error("You cannot deactivate your own account.");
  }
  await query(
    `UPDATE users SET is_active = NOT is_active WHERE id = $1`,
    [targetUserId]
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export async function getPricingRules() {
  const result = await query(
    `SELECT id, rule_name, flat_fee, currency, is_active, updated_at
     FROM pricing_rules
     ORDER BY id ASC`
  );
  return result.rows;
}

export async function updateFlatFee(ruleId: number, flatFee: number): Promise<void> {
  await query(
    `UPDATE pricing_rules SET flat_fee = $1, updated_at = NOW() WHERE id = $2`,
    [flatFee, ruleId]
  );
}
