import { query, getClient } from "@/lib/db/server";

/**
 * Create a pending payment record linked to a delivery and quote.
 * Returns the new payment ID.
 */
export async function createPaymentRecord(params: {
  deliveryId: number;
  quoteId:    number;
  customerId: number;
  amount:     number;
  currency:   string;
}): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO payments (delivery_id, quote_id, customer_id, amount, currency, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [
      params.deliveryId,
      params.quoteId,
      params.customerId,
      params.amount,
      params.currency,
    ]
  );
  return result.rows[0].id;
}

/**
 * Mark a payment as completed and transition the delivery to 'paid'.
 * Runs in a single transaction.
 */
export async function completePayment(params: {
  paymentId:     number;
  pfPaymentId:   string; // PayFast's pf_payment_id
  deliveryId:    number;
}): Promise<void> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE payments
       SET status = 'completed', pf_payment_id = $1, paid_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [params.pfPaymentId, params.paymentId]
    );

    await client.query(
      `UPDATE deliveries
       SET status = 'paid', updated_at = NOW()
       WHERE id = $1`,
      [params.deliveryId]
    );

    await client.query(
      `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
       VALUES ($1, 'paid', 'Payment completed via PayFast', NULL)`,
      [params.deliveryId]
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
 * Mark a payment as failed (e.g. cancelled or ITN validation failed).
 */
export async function failPayment(
  paymentId: number,
  reason?: string
): Promise<void> {
  await query(
    `UPDATE payments
     SET status = 'failed', failure_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    [reason ?? null, paymentId]
  );
}
