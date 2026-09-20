// PayFast/Yoco integrations remain available for reconciliation only.
import { createPaystackCheckout, getPaystackConfig } from "@/lib/paystack";
import { getClient } from "@/lib/db/server";
import { ApiProblem } from "@/lib/api/errors";
import { createPaymentRecord } from "./payments";
import type { PaymentCheckout } from "@ezygo/contracts";

export type PaymentProvider = "paystack";
interface CheckoutDelivery {
  id: number;
  quoteId: number;
  customerId: number;
  trackingNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
}

export async function initialisePaymentCheckout(params: {
  provider: PaymentProvider;
  delivery: CheckoutDelivery;
}): Promise<PaymentCheckout> {
  const { provider, delivery } = params;
  const client = await getClient();
  try {
    await client.query("BEGIN");
    // Serialize double taps across all replicas; use payment-before-delivery
    // row locking to agree with callback and cancellation transactions.
    await client.query("SELECT pg_advisory_xact_lock(584701220, $1)", [delivery.id]);
    await client.query("SELECT id FROM payments WHERE delivery_id = $1 AND status = 'pending' FOR UPDATE", [delivery.id]);
    const state = await client.query<{ status: string }>(
      "SELECT status FROM deliveries WHERE id = $1 AND customer_id = $2 FOR UPDATE",
      [delivery.id, delivery.customerId],
    );
    if (!state.rows[0]) throw new ApiProblem("NOT_FOUND", "Delivery not found.", 404);
    if (state.rows[0].status !== "confirmed") throw new ApiProblem("CONFLICT", "Delivery is not awaiting payment.", 409);
    const paymentId = await createPaymentRecord({
      deliveryId: delivery.id, quoteId: delivery.quoteId, customerId: delivery.customerId,
      amount: delivery.amount, currency: delivery.currency, provider,
    }, client);
    const saved = (await client.query<{
      provider: string; provider_checkout_id: string | null; provider_checkout_url: string | null;
    }>("SELECT provider, provider_checkout_id, provider_checkout_url FROM payments WHERE id = $1", [paymentId])).rows[0];
    if (saved.provider !== provider) throw new ApiProblem("CONFLICT", "A different payment provider already has a pending attempt.", 409);
    if (saved.provider_checkout_id && !saved.provider_checkout_url)
      throw new ApiProblem("CONFLICT", "The existing checkout must be reconciled before starting another payment.", 409);
    const checkout = saved.provider_checkout_id && saved.provider_checkout_url
      ? { authorizationUrl: saved.provider_checkout_url, reference: saved.provider_checkout_id, testMode: getPaystackConfig().testMode }
      : await createPaystackCheckout({
        paymentId, deliveryId: delivery.id, trackingNumber: delivery.trackingNumber,
        amount: delivery.amount, currency: delivery.currency, customerEmail: delivery.customerEmail,
      }, client);
    await client.query("COMMIT");
    return {
      provider, redirect_url: checkout.authorizationUrl, checkout_id: checkout.reference,
      demo_mode: checkout.testMode, payment_id: paymentId, delivery_id: delivery.id,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
