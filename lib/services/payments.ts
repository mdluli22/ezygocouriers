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
     ON CONFLICT (delivery_id) WHERE status = 'pending'
     DO UPDATE SET delivery_id = EXCLUDED.delivery_id
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

    const paymentResult = await client.query<{
      delivery_id: number;
      status: string;
    }>(
      `SELECT delivery_id, status
       FROM payments
       WHERE id = $1
       FOR UPDATE`,
      [params.paymentId]
    );
    const payment = paymentResult.rows[0];

    if (!payment || payment.delivery_id !== params.deliveryId) {
      throw new Error("Payment does not belong to this delivery.");
    }

    // Repair a partially completed historical transaction if necessary, while
    // keeping repeated PayFast ITNs idempotent.
    if (payment.status === "complete") {
      if (!params.pfPaymentId.startsWith("sandbox-return-")) {
        await client.query(
          `UPDATE payments
           SET payfast_pf_payment_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [params.pfPaymentId, params.paymentId]
        );
      }

      const repairedDelivery = await client.query(
        `UPDATE deliveries
         SET status = 'paid', updated_at = NOW()
         WHERE id = $1 AND status = 'confirmed'`,
        [params.deliveryId]
      );

      if (repairedDelivery.rowCount === 1) {
        await client.query(
          `INSERT INTO delivery_status_logs (delivery_id, status, note, updated_by)
           VALUES ($1, 'paid', 'Payment completion reconciled', NULL)`,
          [params.deliveryId]
        );
      }

      await client.query("COMMIT");
      return;
    }

    if (payment.status !== "pending") {
      throw new Error(`Cannot complete a payment with status '${payment.status}'.`);
    }

    await client.query(
      `UPDATE payments
       SET status = 'complete', payfast_pf_payment_id = $1, paid_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [params.pfPaymentId, params.paymentId]
    );

    const deliveryResult = await client.query(
      `UPDATE deliveries
       SET status = 'paid', updated_at = NOW()
       WHERE id = $1 AND status = 'confirmed'`,
      [params.deliveryId]
    );

    if (deliveryResult.rowCount !== 1) {
      throw new Error("Delivery is not awaiting payment.");
    }

    await client.query(
      `UPDATE payments
       SET status = 'cancelled',
           failure_reason = 'Superseded by completed payment',
           updated_at = NOW()
       WHERE delivery_id = $1 AND id <> $2 AND status = 'pending'`,
      [params.deliveryId, params.paymentId]
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

/** Mark a pending PayFast payment as cancelled. */
export async function cancelPayment(
  paymentId: number,
  reason?: string
): Promise<void> {
  await query(
    `UPDATE payments
     SET status = 'cancelled', failure_reason = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'pending'`,
    [reason ?? null, paymentId]
  );
}
