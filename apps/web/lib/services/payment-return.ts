import { createHmac, timingSafeEqual } from "node:crypto";

function signature(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Payment return signing is not configured.");
  return createHmac("sha256", secret).update(`payment-return:${value}`).digest("hex");
}
export function signPaymentReturn(deliveryId: number, reference: string) {
  const value = Buffer.from(JSON.stringify({ deliveryId, reference, expires: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  return `${value}.${signature(value)}`;
}
export function verifyPaymentReturn(token: string) {
  try {
    if (token.length > 2048) return null;
    const [value, mac, extra] = token.split(".");
    if (extra || !/^[a-f0-9]{64}$/.test(mac) || !timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(signature(value), "hex"))) return null;
    const data = JSON.parse(Buffer.from(value, "base64url").toString());
    return Number.isSafeInteger(data.deliveryId) && data.deliveryId > 0 && typeof data.reference === "string" && Number.isFinite(data.expires) && data.expires > Date.now() ? { deliveryId: data.deliveryId as number, reference: data.reference as string } : null;
  } catch { return null; }
}
