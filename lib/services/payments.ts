import { BusinessError } from "@/lib/api/errors";
import { query, getClient } from "@/lib/db/server";
import { autoAssignDelivery } from "./driver-assignment";
import { enqueueRecipientPin } from "./notification-outbox";
import { queuePaymentReview } from "./payment-reviews";

export async function createPaymentRecord(params: {
  deliveryId: number; quoteId: number; customerId: number; amount: number;
  currency: string; provider: "payfast" | "yoco" | "paystack";
}): Promise<number> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const delivery = await client.query("SELECT status,customer_id FROM deliveries WHERE id=$1 FOR UPDATE", [params.deliveryId]);
    if (delivery.rows[0]?.status !== "confirmed" || delivery.rows[0]?.customer_id !== params.customerId) throw new BusinessError("Delivery is not awaiting payment.");
    const settled = await client.query("SELECT id FROM payments WHERE delivery_id=$1 AND status='complete'", [params.deliveryId]);
    if (settled.rowCount) throw new BusinessError("Delivery is already paid.");
    // Preserve old attempts for late-webhook reconciliation when switching a
    // legacy gateway or replacing a genuinely different quote.
    await client.query(`UPDATE payments SET status='cancelled',failure_reason='Replaced by a different checkout',updated_at=NOW()
      WHERE delivery_id=$1 AND status='pending' AND (provider<>$2 OR amount<>$3 OR currency<>$4)`,
      [params.deliveryId,params.provider,params.amount,params.currency]);
    const result = await client.query<{id:number}>(`INSERT INTO payments(delivery_id,quote_id,customer_id,amount,currency,status,provider)
      VALUES($1,$2,$3,$4,$5,'pending',$6)
      ON CONFLICT(delivery_id) WHERE status='pending' DO UPDATE SET updated_at=payments.updated_at
      RETURNING id`, [params.deliveryId,params.quoteId,params.customerId,params.amount,params.currency,params.provider]);
    await client.query("COMMIT");
    return result.rows[0].id;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

/** Verified money is always recorded, even if cancellation won the fulfilment race. */
export async function completePayment(params: {
  paymentId: number; deliveryId: number; provider: "payfast" | "yoco" | "paystack"; providerPaymentId: string;
}): Promise<void> {
  const client = await getClient();
  let dispatch = false;
  try {
    await client.query("BEGIN");
    // All money/state mutations lock delivery before payment to avoid deadlocks.
    const deliveryResult = await client.query("SELECT status FROM deliveries WHERE id=$1 FOR UPDATE", [params.deliveryId]);
    const d = deliveryResult.rows[0];
    const result = await client.query("SELECT delivery_id,status,provider,provider_payment_id FROM payments WHERE id=$1 FOR UPDATE", [params.paymentId]);
    const p = result.rows[0];
    if (!d || !p || p.delivery_id !== params.deliveryId || p.provider !== params.provider) throw new BusinessError("Payment does not match this delivery.");
    if (p.status === "complete") {
      if (p.provider_payment_id !== params.providerPaymentId) {
        await queuePaymentReview(client,params.paymentId,params.providerPaymentId,"Additional provider payment on an already settled attempt");
      } else if (d.status === "confirmed") {
        await client.query("UPDATE deliveries SET status='paid',updated_at=NOW() WHERE id=$1",[params.deliveryId]);
        await client.query("INSERT INTO delivery_status_logs(delivery_id,status,note) VALUES ($1,'paid','Settled payment reconciled')",[params.deliveryId]);
        await enqueueRecipientPin(client,params.deliveryId);
        dispatch = true;
      } else if (["paid","assigned","picked_up","in_transit"].includes(d.status)) {
        await enqueueRecipientPin(client,params.deliveryId);
        dispatch = d.status === "paid";
      } else if (d.status !== "delivered") {
        await queuePaymentReview(client,params.paymentId,params.providerPaymentId,`Settled payment on a ${d.status} delivery`);
      }
    } else {
      const other = await client.query("SELECT id FROM payments WHERE delivery_id=$1 AND id<>$2 AND status='complete'", [params.deliveryId,params.paymentId]);
      await client.query(`UPDATE payments SET status='complete',provider_payment_id=$2,paid_at=COALESCE(paid_at,NOW()),updated_at=NOW(),
        payfast_pf_payment_id=CASE WHEN provider='payfast' THEN $2 ELSE payfast_pf_payment_id END WHERE id=$1`, [params.paymentId,params.providerPaymentId]);
      if (d.status === "confirmed" && !other.rowCount) {
        await client.query("UPDATE deliveries SET status='paid',updated_at=NOW() WHERE id=$1", [params.deliveryId]);
        await client.query("INSERT INTO delivery_status_logs(delivery_id,status,note) VALUES ($1,'paid','Verified payment received')", [params.deliveryId]);
        await enqueueRecipientPin(client,params.deliveryId);
        dispatch = true;
      } else {
        await queuePaymentReview(client,params.paymentId,params.providerPaymentId,
          other.rowCount ? "Additional payment for an already paid delivery" : `Payment received after delivery became ${d.status}`);
      }
      await client.query("UPDATE payments SET status='cancelled',failure_reason='Superseded by settled payment',updated_at=NOW() WHERE delivery_id=$1 AND id<>$2 AND status='pending'", [params.deliveryId,params.paymentId]);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  if (dispatch) {
    try { await autoAssignDelivery(params.deliveryId); } catch { console.error("Paid delivery awaiting assignment", {deliveryId:params.deliveryId}); }
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
     WHERE id = $2 AND status = 'pending'`,
    [reason ?? null, paymentId]
  );
}

/** Mark a pending payment attempt as cancelled. */
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
