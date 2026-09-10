import { buildPaymentData, PAYFAST_HOST, isLocalPayFastDemo } from "@/lib/payfast";
import { createYocoCheckout } from "@/lib/yoco";
import { createPaymentRecord } from "./payments";

export type PaymentProvider = "payfast" | "yoco";

interface CheckoutDelivery {
  id: number;
  quoteId: number;
  customerId: number;
  trackingNumber: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
}

export async function initialisePaymentCheckout(params: {
  provider: PaymentProvider;
  requestUrl: string;
  delivery: CheckoutDelivery;
}) {
  const { provider, delivery } = params;
  const paymentId = await createPaymentRecord({
    deliveryId: delivery.id,
    quoteId: delivery.quoteId,
    customerId: delivery.customerId,
    amount: delivery.amount,
    currency: delivery.currency,
    provider,
  });

  if (provider === "yoco") {
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

  return {
    provider,
    payfast_url: `${PAYFAST_HOST}/eng/process`,
    form_data: buildPaymentData({
      paymentId,
      deliveryId: delivery.id,
      trackingNumber: delivery.trackingNumber,
      amount: delivery.amount,
      customerName: delivery.customerName,
      customerEmail: delivery.customerEmail,
    }),
    demo_mode: isLocalPayFastDemo(params.requestUrl),
    payment_id: paymentId,
    delivery_id: delivery.id,
  };
}
