// Paystack and PayFast checkout are disabled while testing Yoco.
// import { createPaystackCheckout } from "@/lib/paystack";
// Their clients remain in lib/paystack and lib/payfast for restoration.
import { createYocoCheckout } from "@/lib/yoco";
import { createPaymentRecord } from "./payments";
import type { PaymentCheckout } from "@ezygo/contracts";

export type PaymentProvider = "yoco";

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
  const paymentId = await createPaymentRecord({
    deliveryId: delivery.id,
    quoteId: delivery.quoteId,
    customerId: delivery.customerId,
    amount: delivery.amount,
    currency: delivery.currency,
    provider,
  });

  const checkout = await createYocoCheckout({
    paymentId,
    deliveryId: delivery.id,
    trackingNumber: delivery.trackingNumber,
    amount: delivery.amount,
    currency: delivery.currency,
  });

  return {
    provider,
    redirect_url: checkout.redirectUrl,
    checkout_id: checkout.id,
    demo_mode: checkout.processingMode === "test",
    payment_id: paymentId,
    delivery_id: delivery.id,
  };
}
