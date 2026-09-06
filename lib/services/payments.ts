import { query, getClient } from "@/lib/db/server";
import { autoAssignDelivery } from "./driver-assignment";
import { generateDeliveryPin, hashDeliveryPin } from "@/lib/delivery-pin";
import { sendDeliveryPin } from "@/lib/email/smtp";

interface PinNotification {
  deliveryId: number;
  email: string;
  recipientName: string;
  trackingNumber: string;
  pin: string;
  pinHash: string;
}

async function deliverRecipientPin(notification: PinNotification | null): Promise<void> {
  if (!notification) return;

  try {
    await sendDeliveryPin({
      to: notification.email,
      recipientName: notification.recipientName,
      trackingNumber: notification.trackingNumber,
      pin: notification.pin,
    });
    await query(
      `UPDATE deliveries
       SET delivery_pin_sent_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND delivery_pin_hash = $2 AND delivery_pin_sent_at IS NULL`,
      [notification.deliveryId, notification.pinHash]
    );
  } catch (error) {
    // Payment remains complete. A repeated verified ITN or local demo
    // reconciliation retries the notification with a freshly generated PIN.
    console.error("[Delivery PIN email] Delivery failed", {
      deliveryId: notification.deliveryId,
      error,
    });
  }
}

async function tryAutoAssignDelivery(deliveryId: number): Promise<void> {
  try {
    await autoAssignDelivery(deliveryId);
  } catch (error) {
    // A successful payment must never be rolled back because dispatching is
    // temporarily unavailable. Location heartbeats retry waiting deliveries.
    console.error("[Automatic driver assignment]", { deliveryId, error });
  }
}

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
  let pinNotification: PinNotification | null = null;
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

    const deliveryDetailsResult = await client.query<{
      require_pin: boolean;
      delivery_pin_sent_at: Date | null;
      recipient_email: string | null;
      recipient_name: string;
      tracking_number: string;
    }>(
      `SELECT require_pin, delivery_pin_sent_at, recipient_email, recipient_name, tracking_number
       FROM deliveries
       WHERE id = $1
       FOR UPDATE`,
      [params.deliveryId]
    );
    const deliveryDetails = deliveryDetailsResult.rows[0];
    if (!deliveryDetails) throw new Error("Delivery not found for payment.");

    if (deliveryDetails.require_pin && !deliveryDetails.delivery_pin_sent_at) {
      if (!deliveryDetails.recipient_email) {
        throw new Error("Recipient email is required for a PIN-protected delivery.");
      }
      const pin = generateDeliveryPin();
      const pinHash = await hashDeliveryPin(pin);
      await client.query(
        `UPDATE deliveries
         SET delivery_pin_hash = $1, pin_verified_at = NULL, updated_at = NOW()
         WHERE id = $2`,
        [pinHash, params.deliveryId]
      );
      pinNotification = {
        deliveryId: params.deliveryId,
        email: deliveryDetails.recipient_email,
        recipientName: deliveryDetails.recipient_name,
        trackingNumber: deliveryDetails.tracking_number,
        pin,
        pinHash,
      };
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
      await deliverRecipientPin(pinNotification);
      await tryAutoAssignDelivery(params.deliveryId);
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
    await deliverRecipientPin(pinNotification);
    await tryAutoAssignDelivery(params.deliveryId);
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
