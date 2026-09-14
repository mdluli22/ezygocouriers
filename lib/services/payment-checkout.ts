// PayFast and Yoco are intentionally disabled for now. Their implementations
// remain in lib/payfast and lib/yoco so they can be restored later.
import { createPaystackCheckout } from "@/lib/paystack";
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
  const paymentId = await createPaymentRecord({
    deliveryId: delivery.id,
    quoteId: delivery.quoteId,
    customerId: delivery.customerId,
    amount: delivery.amount,
    currency: delivery.currency,
    provider,
  });

  const checkout = await createPaystackCheckout({
    paymentId,
    deliveryId: delivery.id,
    trackingNumber: delivery.trackingNumber,
    amount: delivery.amount,
    currency: delivery.currency,
    customerEmail: delivery.customerEmail,
  });

  return {
    provider,
    redirect_url: checkout.authorizationUrl,
    checkout_id: checkout.reference,
    demo_mode: checkout.testMode,
    payment_id: paymentId,
    delivery_id: delivery.id,
  };
}
