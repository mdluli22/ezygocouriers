import { BusinessError } from "@/lib/api/errors";
import { getClient, query } from "@/lib/db/server";

export async function queuePaymentReview(client: {query: typeof query}, paymentId: number, providerPaymentId: string, reason: string) {
  await client.query(`INSERT INTO payment_reviews(payment_id,provider_payment_id,delivery_id,reason,amount,currency)
    SELECT id,$2,delivery_id,$3,amount,currency FROM payments WHERE id=$1 ON CONFLICT DO NOTHING`,
    [paymentId,providerPaymentId,reason]);
}

export async function getPaymentReviews(customerId?: number) {
  const result = await query(`SELECT r.id,r.delivery_id,r.reason,r.amount,r.currency,r.status,r.created_at,r.resolved_at,
      r.refund_reference,d.tracking_number
    FROM payment_reviews r JOIN deliveries d ON d.id=r.delivery_id
    WHERE ($1::integer IS NULL OR d.customer_id=$1) ORDER BY (r.status='pending') DESC,r.created_at DESC LIMIT 100`, [customerId ?? null]);
  return result.rows;
}

/** Records a refund made with the provider, or a documented reconciliation decision. */
export async function resolvePaymentReview(id: number, actorId: number, status: "refunded" | "resolved", note: string, reference?: string) {
  if (status === "refunded" && !reference?.trim()) throw new BusinessError("A provider refund reference is required.");
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const changed = await client.query(`UPDATE payment_reviews SET status=$2,resolution_note=$3,refund_reference=$4,
      resolved_by=$5,resolved_at=NOW() WHERE id=$1 AND status='pending' RETURNING id`, [id,status,note,reference || null,actorId]);
    if (!changed.rowCount) throw new BusinessError("Review was already resolved or does not exist.");
    await client.query("INSERT INTO payment_review_audit(review_id,actor_id,status,note,reference) VALUES ($1,$2,$3,$4,$5)", [id,actorId,status,note,reference || null]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
