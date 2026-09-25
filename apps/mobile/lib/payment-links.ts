export const PAYMENT_RETURN_URL = "ezygo://payment-return";
export function parsePaymentLink(link: string) {
  const url = new URL(link);
  if (url.protocol !== "ezygo:" || url.hostname !== "payment-return" || url.pathname !== "" || url.port || url.username || url.password || url.hash || [...url.searchParams.keys()].some(key => key !== "token") || url.searchParams.getAll("token").length !== 1) throw new Error("Invalid payment return link.");
  const token = url.searchParams.get("token")!;
  if (!/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token) || token.length > 2048) throw new Error("Invalid payment return link.");
  return token;
}
export function secureCheckoutUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com" || url.port || url.username || url.password) throw new Error("The payment provider returned an unsafe checkout URL.");
  return url.toString();
}
