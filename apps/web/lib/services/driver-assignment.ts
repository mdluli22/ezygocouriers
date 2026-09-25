import { ApiProblem } from "@/lib/api/errors";
import { logServerError } from "@/lib/api/context";
import type { PoolClient } from "pg";
import { getClient } from "@/lib/db/server";
import { CAPE_TOWN_SERVICE_BOUNDS, distanceMetres } from "@ezygo/contracts";
import { notifyAssignedDriver } from "./push-notifications";

const DEFAULT_ASSIGNMENT_RADIUS_KM = 25;
const DEFAULT_LOCATION_MAX_AGE_MINUTES = 15;
const ASSIGNMENT_ADVISORY_LOCK_ID = 584_701_219;

const distanceFromPickupSql = `
  CASE
    WHEN pa.latitude IS NULL
      OR pa.longitude IS NULL
      OR dr.current_latitude IS NULL
      OR dr.current_longitude IS NULL
    THEN NULL
    ELSE 2 * 6371 * ASIN(
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
  END
`;

const preferredDriverLocationSql = `
  pa.latitude IS NOT NULL
  AND pa.longitude IS NOT NULL
  AND dr.current_latitude IS NOT NULL
  AND dr.current_longitude IS NOT NULL
  AND dr.location_updated_at >= NOW() - make_interval(mins => $2::integer)
  AND dr.current_latitude BETWEEN $4 AND $5
  AND dr.current_longitude BETWEEN $6 AND $7
  AND (${distanceFromPickupSql}) <= $3
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

export async function lockAssignments(client: PoolClient): Promise<void> {
  // Allocation is deliberately serialized. This prevents two simultaneous
  // payments/location heartbeats from selecting the same available driver.
  await client.query("SELECT pg_advisory_xact_lock($1)", [
    ASSIGNMENT_ADVISORY_LOCK_ID,
  ]);
}

export interface AutomaticAssignment {
  deliveryId: number;
  driverId: number;
  distanceKm: number | null;
}

function assignmentLogNote(distanceKm: number | null): string {
  return distanceKm === null
    ? "Automatically assigned to the next available driver"
    : `Automatically assigned to the nearest available driver (${distanceKm.toFixed(1)} km from pickup)`;
}

async function notifyAssignment(assignment: AutomaticAssignment | null) {
  if (!assignment) return;
  try {
    await notifyAssignedDriver(assignment);
  } catch (error) {
    // Assignment is authoritative; notification delivery is best effort.
    logServerError("[Assignment push] Delivery failed", {
      deliveryId: assignment.deliveryId,
      driverId: assignment.driverId,
      error,
    });
  }
}

/** Run delivery assignment in its own transaction (safe after payment commit). */
export async function autoAssignDelivery(
  deliveryId: number
): Promise<AutomaticAssignment | null> {
  const client = await getClient();
  let assignment: AutomaticAssignment | null;
  try {
    await client.query("BEGIN");
    assignment = await assignDriverToDelivery(client, deliveryId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await notifyAssignment(assignment);
  return assignment;
}

/**
 * Assign one paid delivery to an active free driver.
 *
 * A recently located driver inside the pickup radius is preferred by distance.
 * If no such driver is available, fall back to the least-recently assigned free
 * driver so a missing GPS heartbeat never leaves a paid delivery stranded.
 */
export async function assignDriverToDelivery(
  client: PoolClient,
  deliveryId: number
): Promise<AutomaticAssignment | null> {
  await lockAssignments(client);

  const candidate = await client.query<{
    driver_id: number;
    distance_km: number | null;
  }>(
    `SELECT
       dr.id AS driver_id,
       CASE
         WHEN ${preferredDriverLocationSql}
         THEN ${distanceFromPickupSql}
         ELSE NULL
       END AS distance_km,
       CASE
         WHEN ${preferredDriverLocationSql}
         THEN 0
         ELSE 1
       END AS proximity_rank
     FROM deliveries delivery
     JOIN addresses pa ON pa.id = delivery.pickup_address_id
     JOIN drivers dr ON TRUE
     JOIN users driver_user ON driver_user.id = dr.user_id
     WHERE delivery.id = $1
       AND delivery.status = 'paid'
       AND delivery.assigned_driver_id IS NULL
       AND dr.status = 'active' AND dr.on_duty = TRUE
       AND driver_user.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1
         FROM deliveries busy_delivery
         WHERE busy_delivery.assigned_driver_id = dr.id
           AND busy_delivery.status IN ('assigned', 'picked_up', 'in_transit')
       )
     ORDER BY
       proximity_rank ASC,
       distance_km ASC NULLS LAST,
       (
         SELECT MAX(previous_delivery.updated_at)
         FROM deliveries previous_delivery
         WHERE previous_delivery.assigned_driver_id = dr.id
       ) ASC NULLS FIRST,
       dr.id ASC
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

  const distanceKm = selected.distance_km === null
    ? null
    : Number(selected.distance_km);
  await client.query(
    `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
     VALUES ($1, 'assigned', $2, NULL)`,
    [
      deliveryId,
      assignmentLogNote(distanceKm),
    ]
  );

  return { deliveryId, driverId: selected.driver_id, distanceKm };
}

/** Give one free driver the oldest waiting paid delivery. */
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
       AND dr.status = 'active' AND dr.on_duty = TRUE
       AND driver_user.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1
         FROM deliveries busy_delivery
         WHERE busy_delivery.assigned_driver_id = dr.id
           AND busy_delivery.status IN ('assigned', 'picked_up', 'in_transit')
       )
     LIMIT 1
     FOR UPDATE OF dr`,
    [driverId]
  );
  if (!driver.rows[0]) return null;

  const candidate = await client.query<{
    delivery_id: number;
    distance_km: number | null;
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
     ORDER BY delivery.created_at ASC, delivery.id ASC
     LIMIT 1
     FOR UPDATE OF delivery SKIP LOCKED`,
    [driverId]
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

  const distanceKm = selected.distance_km === null
    ? null
    : Number(selected.distance_km);
  await client.query(
    `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
     VALUES ($1, 'assigned', $2, NULL)`,
    [
      selected.delivery_id,
      assignmentLogNote(distanceKm),
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
  let assignment: AutomaticAssignment | null;
  try {
    await client.query("BEGIN");
    assignment = await assignNextPaidDeliveryToDriver(client, driverId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await notifyAssignment(assignment);
  return assignment;
}

/** Persist a driver's live location and immediately check the waiting queue. */
export async function updateDriverLocation(params: {
  driverUserId: number;
  sessionId?: string;
  delivery_id?: number;
  recorded_at?: string;
  accuracy?: number;
  latitude: number;
  longitude: number;
}): Promise<AutomaticAssignment | null> {
  const client = await getClient();
  let driverId: number;
  try {
    await client.query("BEGIN");

    if (params.delivery_id) {
      const trip = await client.query<{ status: string }>(`SELECT d.status FROM deliveries d JOIN drivers dr ON dr.id=d.assigned_driver_id WHERE d.id=$1 AND dr.user_id=$2 FOR UPDATE OF d`, [params.delivery_id, params.driverUserId]);
      if (!trip.rows[0] || !["assigned", "picked_up", "in_transit"].includes(trip.rows[0].status)) throw new ApiProblem("CONFLICT", "This trip is no longer active or assigned to you.", 409);
    }
    const recordedAt = params.recorded_at ? new Date(params.recorded_at) : new Date();
    const age = Date.now() - recordedAt.getTime();
    if (!Number.isFinite(age) || age > 60000 || age < -10000) throw new ApiProblem("BAD_REQUEST", "Location is stale or its capture time is invalid.");
    if (params.latitude < CAPE_TOWN_SERVICE_BOUNDS.south || params.latitude > CAPE_TOWN_SERVICE_BOUNDS.north || params.longitude < CAPE_TOWN_SERVICE_BOUNDS.west || params.longitude > CAPE_TOWN_SERVICE_BOUNDS.east) throw new ApiProblem("BAD_REQUEST", "Location is outside the operating area.");
    const eligible = await client.query<{ id: number; current_latitude: string | null; current_longitude: string | null; location_updated_at: Date | null; location_stopped_at: Date | null }>("SELECT id,current_latitude,current_longitude,location_updated_at,location_stopped_at FROM drivers WHERE user_id=$1 AND status='active' AND on_duty=TRUE FOR UPDATE", [params.driverUserId]);
    if (!eligible.rows[0]) throw new ApiProblem("FORBIDDEN", "An active driver profile is required.", 403);
    const previous = eligible.rows[0];
    if (previous.location_stopped_at && recordedAt.getTime() <= previous.location_stopped_at.getTime()) throw new ApiProblem("CONFLICT", "Location was captured before sharing stopped.", 409);
    const seconds = previous.location_updated_at ? (recordedAt.getTime()-previous.location_updated_at.getTime())/1000 : 0;
    if (seconds > 0 && seconds < 300 && previous.current_latitude !== null && previous.current_longitude !== null && distanceMetres({latitude:Number(previous.current_latitude),longitude:Number(previous.current_longitude)},params) > 200 + seconds * 55) throw new ApiProblem("BAD_REQUEST", "Location change is implausible. Wait for a fresh GPS reading.");
    const result = await client.query<{ id: number }>(
      `UPDATE drivers
       SET current_latitude = $1,
           current_longitude = $2,
           location_updated_at = $4,
           location_accuracy = $5,
           location_delivery_id = $6,
           location_session_id = $7,
           location_received_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $3 AND status = 'active' AND (location_updated_at IS NULL OR location_updated_at < $4)
       RETURNING id`,
      [params.latitude, params.longitude, params.driverUserId, recordedAt, params.accuracy ?? null, params.delivery_id ?? null, params.sessionId ?? null]
    );
    const driver = result.rows[0];
    if (!driver) { await client.query("COMMIT"); return null; }
    driverId = driver.id;

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (params.delivery_id) return null;
  try {
    return await autoAssignNextPaidDeliveryToDriver(driverId);
  } catch (error) {
    // The location heartbeat succeeded. A later heartbeat will retry dispatch.
    logServerError("[Automatic delivery queue assignment]", { driverId, error });
    return null;
  }
}
