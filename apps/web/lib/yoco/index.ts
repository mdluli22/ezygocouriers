import crypto from "crypto";
import { query } from "@/lib/db/server";

const YOCO_CHECKOUT_URL = "https://payments.yoco.com/api/checkouts";

export interface YocoConfig {
  secretKey: string;
  webhookSecret: string;
  sandbox: boolean;
  appUrl: string;
}

export interface YocoCheckout {
  id: string;
  status: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  processingMode: "test" | "live";
}

export function getYocoConfig(): YocoConfig {
  const sandbox = process.env.YOCO_SANDBOX !== "false";
  const secretKey = process.env.YOCO_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.YOCO_WEBHOOK_SECRET?.trim() ?? "";
  const appUrl = (
    process.env.YOCO_APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  ).replace(/\/$/, "");

  if (!secretKey) {
    throw new Error("YOCO_SECRET_KEY is required to use Yoco checkout.");
  }
  if (sandbox && !secretKey.startsWith("sk_test_")) {
    throw new Error("YOCO_SANDBOX=true requires a Yoco test secret key (sk_test_...).");
  }
  if (!sandbox && !secretKey.startsWith("sk_live_")) {
    throw new Error("YOCO_SANDBOX=false requires a Yoco live secret key (sk_live_...).");
  }
  if (!appUrl) {
    throw new Error("YOCO_APP_URL or NEXT_PUBLIC_APP_URL is required to use Yoco checkout.");
  }
  if (!webhookSecret.startsWith("whsec_")) {
    throw new Error("YOCO_WEBHOOK_SECRET is required to verify Yoco payments.");
  }

  return { secretKey, webhookSecret, sandbox, appUrl };
}

export async function createYocoCheckout(params: {
  paymentId: number;
  deliveryId: number;
  trackingNumber: string;
  amount: number;
  currency: string;
}): Promise<YocoCheckout> {
  const config = getYocoConfig();
  const amountInCents = Math.round(params.amount * 100);

  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new Error("Yoco checkout amount must be a positive amount in cents.");
  }
  if (params.currency !== "ZAR") {
    throw new Error("Yoco checkout currently supports ZAR only.");
  }

  const response = await fetch(YOCO_CHECKOUT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `ezygo-payment-${params.paymentId}-yoco`,
    },
    body: JSON.stringify({
      amount: amountInCents,
      currency: params.currency,
      successUrl: `${config.appUrl}/dashboard?payment=success&delivery=${params.deliveryId}&payment_id=${params.paymentId}&provider=yoco`,
      cancelUrl: `${config.appUrl}/dashboard?payment=cancelled&delivery=${params.deliveryId}&provider=yoco`,
      failureUrl: `${config.appUrl}/dashboard?payment=failed&delivery=${params.deliveryId}&provider=yoco`,
      clientReferenceId: String(params.paymentId),
      externalId: params.trackingNumber,
      metadata: {
        paymentId: String(params.paymentId),
        deliveryId: String(params.deliveryId),
        trackingNumber: params.trackingNumber,
      },
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | (Partial<YocoCheckout> & { message?: string })
    | null;

  if (!response.ok || !body?.id || !body.redirectUrl) {
    throw new Error(body?.message || `Yoco checkout creation failed (${response.status}).`);
  }

  await query(
    `UPDATE payments
     SET provider_checkout_id = $1, updated_at = NOW()
     WHERE id = $2 AND provider = 'yoco' AND status = 'pending'`,
    [body.id, params.paymentId]
  );

  return body as YocoCheckout;
}

function decodeWebhookSecret(secret: string): Buffer {
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return Buffer.from(encoded, "base64");
}

/** Verify Yoco's Standard Webhooks signature and reject stale deliveries. */
export function verifyYocoWebhook(params: {
  rawBody: string;
  webhookId: string;
  webhookTimestamp: string;
  webhookSignature: string;
  toleranceSeconds?: number;
}): boolean {
  const secret = getYocoConfig().webhookSecret;
  if (!secret) return false;

  const timestamp = Number(params.webhookTimestamp);
  if (!Number.isFinite(timestamp)) return false;
  const tolerance = params.toleranceSeconds ?? 300;
  if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) return false;

  const signedPayload = `${params.webhookId}.${params.webhookTimestamp}.${params.rawBody}`;
  const expected = crypto
    .createHmac("sha256", decodeWebhookSecret(secret))
    .update(signedPayload)
    .digest();

  return params.webhookSignature.split(" ").some((entry) => {
    const [version, signature] = entry.split(",", 2);
    if (version !== "v1" || !signature) return false;
    try {
      const received = Buffer.from(signature, "base64");
      return received.length === expected.length && crypto.timingSafeEqual(received, expected);
    } catch {
      return false;
    }
  });
}
