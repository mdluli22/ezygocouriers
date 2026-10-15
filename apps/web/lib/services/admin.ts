import { defaultPage, pageWhere, pageResult, type PageQuery } from "@/lib/api/pagination";
import { BusinessError } from "@/lib/api/errors";
import { query, getClient } from "@/lib/db/server";
import type { DeliveryStatus, UserRole } from "@ezygo/contracts";
import { notifyAssignedDriver } from "@/lib/services/push-notifications";

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
              COUNT(*) FILTER (WHERE status = 'active')   AS active,
              COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
              COUNT(*) FILTER (WHERE status = 'suspended') AS suspended
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

export async function getAdminDeliveries(status?: DeliveryStatus | "all", page: PageQuery = defaultPage) {
  const filter = status && status !== "all" ? "WHERE d.status = $1" : "";
  const params: unknown[] = status && status !== "all" ? [status] : [];

  const extra = pageWhere(page, params, "d.id", "concat_ws(' ',d.tracking_number,cu.full_name,cu.email,pa.city,da.city)", "d.status");
  params.push(page.limit + 1);
  const result = await query<{ id: number; [key: string]: unknown }>(
    `SELECT
       d.id,
       d.tracking_number,
       d.status,
       d.recipient_name,
       d.recipient_phone,
       d.parcel_description,
       d.package_type,
       d.package_category,
       d.fragile,
       d.require_pin,
       d.scheduled_time,
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
     ${filter || "WHERE TRUE"} ${extra}
     ORDER BY d.id DESC LIMIT $${params.length}`,
    params
  );
  return pageResult(result.rows, page);
}

export async function assignDriver(
  deliveryId: number,
  driverId: number,
  actorId: number
): Promise<void> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    await client.query("SELECT pg_advisory_xact_lock($1)",[584701219]);
    const delivery = await client.query("SELECT status,assigned_driver_id FROM deliveries WHERE id=$1 FOR UPDATE", [deliveryId]);
    if (!delivery.rows[0] || !["paid","assigned"].includes(delivery.rows[0].status)) throw new BusinessError("Only paid deliveries awaiting pickup can be assigned.");
    const driver = await client.query(`SELECT dr.id FROM drivers dr JOIN users u ON u.id=dr.user_id
      WHERE dr.id=$1 AND dr.status='active' AND u.is_active=TRUE AND u.email_verified=TRUE FOR UPDATE OF dr,u`, [driverId]);
    if (!driver.rowCount) throw new BusinessError("Driver is inactive or unavailable.");
    const busy = await client.query("SELECT id FROM deliveries WHERE assigned_driver_id=$1 AND id<>$2 AND status IN ('assigned','picked_up','in_transit')", [driverId,deliveryId]);
    if (busy.rowCount) throw new BusinessError("Driver already has an active delivery.");
    const payment = await client.query("SELECT id FROM payments WHERE delivery_id=$1 AND status='complete'", [deliveryId]);
    if (!payment.rowCount) throw new BusinessError("A verified payment is required before assignment.");
    await client.query("UPDATE deliveries SET assigned_driver_id=$1,status='assigned',updated_at=NOW() WHERE id=$2", [driverId,deliveryId]);

    await client.query(
      `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
       VALUES ($1, 'assigned', 'Driver assigned by admin', $2)`,
      [deliveryId,actorId]
    );

    await notifyAssignedDriver({driverId,deliveryId},client);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getAdminDrivers(page: PageQuery = defaultPage) {
  const params: unknown[] = [];
  const extra = pageWhere(page, params, "dr.id", "concat_ws(' ',u.full_name,u.email,dr.vehicle_reg)");
  params.push(page.limit + 1);
  const result = await query<{ id: number; [key: string]: unknown }>(
    `SELECT
       dr.id,
       dr.license_number,
       dr.vehicle_type,
       dr.vehicle_reg,
       dr.status,
       dr.notes,
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
     WHERE TRUE ${extra}
     GROUP BY dr.id, u.id
     ORDER BY dr.id DESC LIMIT $${params.length}`, params
  );
  return pageResult(result.rows, page);
}

export async function createDriver(data: {
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  license_number: string;
  vehicle_type: string;
  vehicle_reg: string;
}): Promise<{ userId: number; driverId: number }> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const userResult = await client.query<{ id: number }>(
      `INSERT INTO users (full_name, email, phone, password_hash, auth_provider, role)
       VALUES ($1, $2, $3, $4, 'email', 'driver')
       RETURNING id`,
      [data.full_name, data.email, data.phone, data.password_hash]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO auth_accounts
         (id, account_id, provider_id, user_id, password)
       VALUES ($1, $2, 'credential', $3, $4)`,
      [crypto.randomUUID(), String(userId), userId, data.password_hash]
    );

    const driverResult = await client.query<{ id: number }>(
      `INSERT INTO drivers (user_id, license_number, vehicle_type, vehicle_reg)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, data.license_number, data.vehicle_type, data.vehicle_reg]
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
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await client.query(`UPDATE drivers SET status=CASE WHEN status='active' THEN 'inactive'::driver_status ELSE 'active'::driver_status END,
      updated_at=NOW() WHERE id=$1 RETURNING user_id,status`, [driverId]);
    if (result.rows[0]?.status === "inactive") await client.query("DELETE FROM auth_sessions WHERE user_id=$1", [result.rows[0].user_id]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAdminUsers(role?: UserRole, page: PageQuery = defaultPage) {
  const filter = role ? "WHERE role = $1" : "";
  const params: unknown[] = role ? [role] : [];
  const extra = pageWhere(page, params, "id", "concat_ws(' ',full_name,email,phone)");
  params.push(page.limit + 1);
  const result = await query<{ id: number; [key: string]: unknown }>(
    `SELECT id, full_name, email, phone, role, is_active, auth_provider, created_at
     FROM users
     ${filter || "WHERE TRUE"} ${extra}
     ORDER BY id DESC LIMIT $${params.length}`,
    params
  );
  return pageResult(result.rows, page);
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
