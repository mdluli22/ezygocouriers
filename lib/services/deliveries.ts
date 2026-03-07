import { query, getClient } from "@/lib/db/server";
import { generateQuote, acceptQuote } from "./quotes";
import { CreateDeliveryInput } from "@/lib/validations/delivery";
import {
  DeliveryStatus,
  isValidTransition,
} from "@/lib/constants/delivery-status";

export interface CreatedDelivery {
  id: number;
  trackingNumber: string;
  status: string;
  quote: {
    id: number;
    amount: number;
    currency: string;
  };
}

/**
 * Create a full delivery record inside a transaction:
 * 1. Insert pickup address
 * 2. Insert dropoff address
 * 3. Generate a quote
 * 4. Insert the delivery
 * 5. Insert initial status log
 */
export async function createDelivery(
  customerId: number,
  input: CreateDeliveryInput
): Promise<CreatedDelivery> {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Insert pickup address
    const pickupResult = await client.query<{ id: number }>(
      `INSERT INTO addresses (user_id, street_address, suburb, city, province, postal_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        customerId,
        input.pickup_address.street_address,
        input.pickup_address.suburb || null,
        input.pickup_address.city,
        input.pickup_address.province || null,
        input.pickup_address.postal_code || null,
        input.pickup_address.notes || null,
      ]
    );
    const pickupAddressId = pickupResult.rows[0].id;

    // 2. Insert dropoff address
    const dropoffResult = await client.query<{ id: number }>(
      `INSERT INTO addresses (user_id, street_address, suburb, city, province, postal_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        customerId,
        input.dropoff_address.street_address,
        input.dropoff_address.suburb || null,
        input.dropoff_address.city,
        input.dropoff_address.province || null,
        input.dropoff_address.postal_code || null,
        input.dropoff_address.notes || null,
      ]
    );
    const dropoffAddressId = dropoffResult.rows[0].id;

    // 3. Generate quote (uses flat fee from DB)
    const quote = await generateQuote();

    // 4. Insert delivery
    const deliveryResult = await client.query<{
      id: number;
      tracking_number: string;
      status: string;
    }>(
      `INSERT INTO deliveries (
         customer_id, pickup_address_id, dropoff_address_id, quote_id,
         pickup_contact_name, pickup_contact_phone,
         recipient_name, recipient_phone,
         parcel_description, special_instructions, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'quoted')
       RETURNING id, tracking_number, status`,
      [
        customerId,
        pickupAddressId,
        dropoffAddressId,
        quote.quoteId,
        input.pickup_contact_name,
        input.pickup_contact_phone,
        input.recipient_name,
        input.recipient_phone,
        input.parcel_description,
        input.special_instructions || null,
      ]
    );

    const delivery = deliveryResult.rows[0];

    // 5. Insert initial status log
    await client.query(
      `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
       VALUES ($1, 'quoted', 'Delivery created and quote generated', $2)`,
      [delivery.id, customerId]
    );

    await client.query("COMMIT");

    return {
      id:             delivery.id,
      trackingNumber: delivery.tracking_number,
      status:         delivery.status,
      quote: {
        id:       quote.quoteId,
        amount:   quote.amount,
        currency: quote.currency,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Confirm a delivery (customer accepts the quote).
 * Transitions: quoted → confirmed
 */
export async function confirmDelivery(
  deliveryId: number,
  customerId: number
): Promise<void> {
  const result = await query<{ status: string; customer_id: number; quote_id: number }>(
    `SELECT status, customer_id, quote_id FROM deliveries WHERE id = $1 LIMIT 1`,
    [deliveryId]
  );

  const delivery = result.rows[0];
  if (!delivery) throw new Error("Delivery not found.");
  if (delivery.customer_id !== customerId) throw new Error("Unauthorized.");
  if (!isValidTransition(delivery.status as DeliveryStatus, "confirmed")) {
    throw new Error(`Cannot confirm a delivery with status '${delivery.status}'.`);
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE deliveries SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
      [deliveryId]
    );

    if (delivery.quote_id) {
      await acceptQuote(delivery.quote_id);
    }

    await client.query(
      `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
       VALUES ($1, 'confirmed', 'Customer confirmed the delivery and accepted the quote', $2)`,
      [deliveryId, customerId]
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Fetch all deliveries for a customer with summary info.
 */
export async function getCustomerDeliveries(customerId: number) {
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
       pa.street_address  AS pickup_street,
       pa.city            AS pickup_city,
       da.street_address  AS dropoff_street,
       da.city            AS dropoff_city,
       q.amount           AS quote_amount,
       q.currency         AS quote_currency
     FROM deliveries d
     JOIN addresses pa ON pa.id = d.pickup_address_id
     JOIN addresses da ON da.id = d.dropoff_address_id
     LEFT JOIN quotes q ON q.id = d.quote_id
     WHERE d.customer_id = $1
     ORDER BY d.created_at DESC`,
    [customerId]
  );
  return result.rows;
}

/**
 * Fetch a single delivery with full details (customer must own it).
 */
export async function getDeliveryById(deliveryId: number, customerId: number) {
  const result = await query(
    `SELECT
       d.*,
       pa.street_address  AS pickup_street,
       pa.suburb          AS pickup_suburb,
       pa.city            AS pickup_city,
       pa.province        AS pickup_province,
       pa.postal_code     AS pickup_postal_code,
       pa.notes           AS pickup_address_notes,
       da.street_address  AS dropoff_street,
       da.suburb          AS dropoff_suburb,
       da.city            AS dropoff_city,
       da.province        AS dropoff_province,
       da.postal_code     AS dropoff_postal_code,
       da.notes           AS dropoff_address_notes,
       q.amount           AS quote_amount,
       q.currency         AS quote_currency,
       q.status           AS quote_status,
       u.full_name        AS driver_name,
       u.phone            AS driver_phone
     FROM deliveries d
     JOIN addresses pa ON pa.id = d.pickup_address_id
     JOIN addresses da ON da.id = d.dropoff_address_id
     LEFT JOIN quotes q ON q.id = d.quote_id
     LEFT JOIN drivers dr ON dr.id = d.assigned_driver_id
     LEFT JOIN users u ON u.id = dr.user_id
     WHERE d.id = $1 AND d.customer_id = $2
     LIMIT 1`,
    [deliveryId, customerId]
  );
  return result.rows[0] ?? null;
}

/**
 * Fetch status logs for a delivery.
 */
export async function getDeliveryStatusLogs(deliveryId: number) {
  const result = await query(
    `SELECT
       dsl.id,
       dsl.status,
       dsl.note,
       dsl.created_at,
       u.full_name AS updated_by_name
     FROM delivery_status_logs dsl
     LEFT JOIN users u ON u.id = dsl.updated_by
     WHERE dsl.delivery_id = $1
     ORDER BY dsl.created_at ASC`,
    [deliveryId]
  );
  return result.rows;
}
