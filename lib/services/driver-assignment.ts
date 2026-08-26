import type { PoolClient } from "pg";
import { getClient } from "@/lib/db/server";
import { CAPE_TOWN_SERVICE_BOUNDS } from "@/lib/constants/service-area";

const DEFAULT_ASSIGNMENT_RADIUS_KM = 25;
const DEFAULT_LOCATION_MAX_AGE_MINUTES = 15;
const ASSIGNMENT_ADVISORY_LOCK_ID = 584_701_219;

const distanceFromPickupSql = `
  2 * 6371 * ASIN(
    SQRT(
      LEAST(
        1.0,
        GREATEST(
          0.0,
          POWER(
            SIN(RADIANS((pa.latitude::double precision - dr.current_latitude::double precision) / 2)),
            2
          ) +
          COS(RADIANS(dr.current_latitude::double precision)) *
          COS(RADIANS(pa.latitude::double precision)) *
          POWER(
            SIN(RADIANS((pa.longitude::double precision - dr.current_longitude::double precision) / 2)),
            2
          )
        )
      )
    )
  )
`;

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function assignmentRadiusKm(): number {
  return positiveNumber(
    process.env.AUTO_ASSIGNMENT_RADIUS_KM,
    DEFAULT_ASSIGNMENT_RADIUS_KM
  );
}

function locationMaxAgeMinutes(): number {
  return Math.max(
    1,
    Math.round(
      positiveNumber(
        process.env.DRIVER_LOCATION_MAX_AGE_MINUTES,
        DEFAULT_LOCATION_MAX_AGE_MINUTES
      )
    )
  );
}

async function lockAssignments(client: PoolClient): Promise<void> {
  // Allocation is deliberately serialized. This prevents two simultaneous
  // payments/location heartbeats from selecting the same available driver.
  await client.query("SELECT pg_advisory_xact_lock($1)", [
    ASSIGNMENT_ADVISORY_LOCK_ID,
  ]);
}

export interface AutomaticAssignment {
  deliveryId: number;
  driverId: number;
  distanceKm: number;
}

/** Run delivery assignment in its own transaction (safe after payment commit). */
export async function autoAssignDelivery(
  deliveryId: number
): Promise<AutomaticAssignment | null> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const assignment = await assignDriverToDelivery(client, deliveryId);
    await client.query("COMMIT");
    return assignment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Assign the closest recently-located, active and free driver to one paid delivery. */
export async function assignDriverToDelivery(
  client: PoolClient,
  deliveryId: number
): Promise<AutomaticAssignment | null> {
  await lockAssignments(client);

  const candidate = await client.query<{
    driver_id: number;
    distance_km: number;
  }>(
    `SELECT
       dr.id AS driver_id,
       ${distanceFromPickupSql} AS distance_km
     FROM deliveries delivery
     JOIN addresses pa ON pa.id = delivery.pickup_address_id
     JOIN drivers dr ON TRUE
     JOIN users driver_user ON driver_user.id = dr.user_id
     WHERE delivery.id = $1
       AND delivery.status = 'paid'
       AND delivery.assigned_driver_id IS NULL
       AND pa.latitude IS NOT NULL
       AND pa.longitude IS NOT NULL
       AND dr.status = 'active'
       AND driver_user.is_active = TRUE
       AND dr.current_latitude IS NOT NULL
       AND dr.current_longitude IS NOT NULL
       AND dr.location_updated_at >= NOW() - make_interval(mins => $2::integer)
       AND (${distanceFromPickupSql}) <= $3
       AND dr.current_latitude BETWEEN $4 AND $5
       AND dr.current_longitude BETWEEN $6 AND $7
       AND NOT EXISTS (
         SELECT 1
         FROM deliveries busy_delivery
         WHERE busy_delivery.assigned_driver_id = dr.id
           AND busy_delivery.status IN ('assigned', 'picked_up', 'in_transit')
       )
     ORDER BY distance_km ASC, dr.id ASC
     LIMIT 1
     FOR UPDATE OF delivery, dr SKIP LOCKED`,
    [
      deliveryId,
      locationMaxAgeMinutes(),
      assignmentRadiusKm(),
      CAPE_TOWN_SERVICE_BOUNDS.south,
      CAPE_TOWN_SERVICE_BOUNDS.north,
      CAPE_TOWN_SERVICE_BOUNDS.west,
      CAPE_TOWN_SERVICE_BOUNDS.east,
    ]
  );

  const selected = candidate.rows[0];
  if (!selected) return null;

  const updated = await client.query(
    `UPDATE deliveries
     SET assigned_driver_id = $1, status = 'assigned', updated_at = NOW()
     WHERE id = $2 AND status = 'paid' AND assigned_driver_id IS NULL`,
    [selected.driver_id, deliveryId]
  );
  if (updated.rowCount !== 1) return null;

  const distanceKm = Number(selected.distance_km);
  await client.query(
    `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
     VALUES ($1, 'assigned', $2, NULL)`,
    [
      deliveryId,
      `Automatically assigned to the nearest available driver (${distanceKm.toFixed(1)} km from pickup)`,
    ]
  );

  return { deliveryId, driverId: selected.driver_id, distanceKm };
}

/** Give one free driver the closest waiting paid delivery within the service radius. */
export async function assignNextPaidDeliveryToDriver(
  client: PoolClient,
  driverId: number
): Promise<AutomaticAssignment | null> {
  await lockAssignments(client);

  const driver = await client.query<{ id: number }>(
    `SELECT dr.id
     FROM drivers dr
     JOIN users driver_user ON driver_user.id = dr.user_id
     WHERE dr.id = $1
       AND dr.status = 'active'
       AND driver_user.is_active = TRUE
       AND dr.current_latitude IS NOT NULL
       AND dr.current_longitude IS NOT NULL
       AND dr.location_updated_at >= NOW() - make_interval(mins => $2::integer)
       AND dr.current_latitude BETWEEN $3 AND $4
       AND dr.current_longitude BETWEEN $5 AND $6
       AND NOT EXISTS (
         SELECT 1
         FROM deliveries busy_delivery
         WHERE busy_delivery.assigned_driver_id = dr.id
           AND busy_delivery.status IN ('assigned', 'picked_up', 'in_transit')
       )
     LIMIT 1
     FOR UPDATE OF dr`,
    [
      driverId,
      locationMaxAgeMinutes(),
      CAPE_TOWN_SERVICE_BOUNDS.south,
      CAPE_TOWN_SERVICE_BOUNDS.north,
      CAPE_TOWN_SERVICE_BOUNDS.west,
      CAPE_TOWN_SERVICE_BOUNDS.east,
    ]
  );
  if (!driver.rows[0]) return null;

  const candidate = await client.query<{
    delivery_id: number;
    distance_km: number;
  }>(
    `SELECT
       delivery.id AS delivery_id,
       ${distanceFromPickupSql} AS distance_km
     FROM deliveries delivery
     JOIN addresses pa ON pa.id = delivery.pickup_address_id
     JOIN drivers dr ON dr.id = $1
     WHERE delivery.status = 'paid'
       AND delivery.assigned_driver_id IS NULL
       AND pa.latitude IS NOT NULL
       AND pa.longitude IS NOT NULL
       AND (${distanceFromPickupSql}) <= $2
     ORDER BY distance_km ASC, delivery.created_at ASC, delivery.id ASC
     LIMIT 1
     FOR UPDATE OF delivery SKIP LOCKED`,
    [driverId, assignmentRadiusKm()]
  );

  const selected = candidate.rows[0];
  if (!selected) return null;

  const updated = await client.query(
    `UPDATE deliveries
     SET assigned_driver_id = $1, status = 'assigned', updated_at = NOW()
     WHERE id = $2 AND status = 'paid' AND assigned_driver_id IS NULL`,
    [driverId, selected.delivery_id]
  );
  if (updated.rowCount !== 1) return null;

  const distanceKm = Number(selected.distance_km);
  await client.query(
    `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
     VALUES ($1, 'assigned', $2, NULL)`,
    [
      selected.delivery_id,
      `Automatically assigned to the nearest available driver (${distanceKm.toFixed(1)} km from pickup)`,
    ]
  );

  return {
    deliveryId: selected.delivery_id,
    driverId,
    distanceKm,
  };
}

/** Run queue assignment for one free driver in its own transaction. */
export async function autoAssignNextPaidDeliveryToDriver(
  driverId: number
): Promise<AutomaticAssignment | null> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const assignment = await assignNextPaidDeliveryToDriver(client, driverId);
    await client.query("COMMIT");
    return assignment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Persist a driver's live location and immediately check the waiting queue. */
export async function updateDriverLocation(params: {
  driverUserId: number;
  latitude: number;
  longitude: number;
}): Promise<AutomaticAssignment | null> {
  const client = await getClient();
  let driverId: number;
  try {
    await client.query("BEGIN");

    const result = await client.query<{ id: number }>(
      `UPDATE drivers
       SET current_latitude = $1,
           current_longitude = $2,
           location_updated_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $3
       RETURNING id`,
      [params.latitude, params.longitude, params.driverUserId]
    );
    const driver = result.rows[0];
    if (!driver) throw new Error("Driver profile not found.");
    driverId = driver.id;

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  try {
    return await autoAssignNextPaidDeliveryToDriver(driverId);
  } catch (error) {
    // The location heartbeat succeeded. A later heartbeat will retry dispatch.
    console.error("[Automatic delivery queue assignment]", { driverId, error });
    return null;
  }
}
