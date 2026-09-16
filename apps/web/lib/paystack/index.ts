import { createHmac, timingSafeEqual } from "crypto";
import { query } from "@/lib/db/server";

const PAYSTACK_API_URL = "https://api.paystack.co";

export interface PaystackConfig {
  secretKey: string;
  appUrl: string;
  testMode: boolean;
}

interface PaystackTransaction {
  id: number;
  domain: "test" | "live";
  status: string;
  reference: string;
  amount: number;
  currency: string;
  gateway_response?: string;
  metadata?: {
    payment_id?: number;
    delivery_id?: number;
  };
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data?: T;
}

export function getPaystackConfig(): PaystackConfig {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
  const appUrl = (
    process.env.PAYSTACK_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "");

  if (!/^sk_(test|live)_/.test(secretKey)) {
    throw new Error("PAYSTACK_SECRET_KEY must be a valid Paystack test or live secret key.");
  }
  if (!/^https?:\/\//.test(appUrl)) {
    throw new Error("PAYSTACK_APP_URL or NEXT_PUBLIC_APP_URL must be a valid app origin.");
  }

  return {
    secretKey,
    appUrl,
    testMode: secretKey.startsWith("sk_test_"),
  };
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getPaystackConfig();
  const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !body.status || !body.data) {
    throw new Error(body.message || `Paystack request failed (${response.status}).`);
  }
  return body.data;
}

export async function createPaystackCheckout(params: {
  paymentId: number;
  deliveryId: number;
  trackingNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
}) {
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error("Paystack checkout amount must be positive.");
  }
  if (!params.customerEmail) {
    throw new Error("A customer email is required for Paystack checkout.");
  }

  const config = getPaystackConfig();
  const reference = `ezygo-${params.paymentId}-${Date.now()}`;
  const callbackUrl = new URL("/api/payments/paystack/callback", config.appUrl);
  callbackUrl.searchParams.set("payment_id", String(params.paymentId));
  callbackUrl.searchParams.set("delivery_id", String(params.deliveryId));

  const checkout = await paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.customerEmail,
      amount: Math.round(params.amount * 100),
      currency: params.currency.toUpperCase(),
      reference,
      callback_url: callbackUrl.toString(),
      metadata: {
        payment_id: params.paymentId,
        delivery_id: params.deliveryId,
        tracking_number: params.trackingNumber,
        cancel_action: `${config.appUrl}/dashboard/tracking/${params.deliveryId}?payment=cancelled`,
      },
    }),
  });

  await query(
    `UPDATE payments
     SET provider_checkout_id = $1, updated_at = NOW()
     WHERE id = $2 AND provider = 'paystack' AND status = 'pending'`,
    [checkout.reference, params.paymentId]
  );

  return {
    authorizationUrl: checkout.authorization_url,
    accessCode: checkout.access_code,
    reference: checkout.reference,
    testMode: config.testMode,
  };
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export function verifyPaystackWebhook(rawBody: string, signature: string | null): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;

  const expected = createHmac("sha512", getPaystackConfig().secretKey)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

export function paystackTransactionMatches(params: {
  transaction: PaystackTransaction;
  reference: string;
  amount: number;
  currency: string;
}): boolean {
  const config = getPaystackConfig();
  return (
    params.transaction.status === "success" &&
    params.transaction.reference === params.reference &&
    params.transaction.amount === Math.round(params.amount * 100) &&
    params.transaction.currency.toUpperCase() === params.currency.toUpperCase() &&
    params.transaction.domain === (config.testMode ? "test" : "live")
  );
}

export type { PaystackTransaction };
