import crypto from "crypto";

const PAYFAST_MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID!;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY!;
const PAYFAST_PASSPHRASE   = process.env.PAYFAST_PASSPHRASE ?? "";
const PAYFAST_SANDBOX      = process.env.PAYFAST_SANDBOX !== "false";

export const PAYFAST_HOST = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za"
  : "https://www.payfast.co.za";

export const PAYFAST_ITN_IPS = [
  "197.97.145.144",
  "197.97.145.145",
  "197.97.145.146",
  "197.97.145.147",
  "41.74.179.194",
  // Sandbox
  "197.97.145.148",
];

export interface PayFastPaymentData {
  [key: string]:  string | undefined;
  merchant_id:    string;
  merchant_key:   string;
  return_url:     string;
  cancel_url:     string;
  notify_url:     string;
  name_first:     string;
  email_address:  string;
  m_payment_id:   string;
  amount:         string;
  item_name:      string;
  custom_str1?:   string; // delivery_id
  custom_str2?:   string; // tracking_number
}

/**
 * Build the PayFast form data object with a signature appended.
 */
export function buildPaymentData(params: {
  paymentId:      number;
  deliveryId:     number;
  trackingNumber: string;
  amount:         number;
  customerName:   string;
  customerEmail:  string;
}): PayFastPaymentData & { signature: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const data: PayFastPaymentData = {
    merchant_id:   PAYFAST_MERCHANT_ID,
    merchant_key:  PAYFAST_MERCHANT_KEY,
    return_url:    `${appUrl}/dashboard/tracking/${params.deliveryId}?confirmed=1`,
    cancel_url:    `${appUrl}/dashboard/tracking/${params.deliveryId}`,
    notify_url:    `${appUrl}/api/payments/callback`,
    name_first:    params.customerName.split(" ")[0],
    email_address: params.customerEmail,
    m_payment_id:  String(params.paymentId),
    amount:        params.amount.toFixed(2),
    item_name:     `EzyGo Delivery ${params.trackingNumber}`,
    custom_str1:   String(params.deliveryId),
    custom_str2:   params.trackingNumber,
  };

  const signature = generateSignature(data);
  return { ...data, signature };
}

/**
 * Generate a PayFast MD5 signature from a data object.
 * Keys must be in the order PayFast expects (insertion order).
 */
export function generateSignature(
  data: Record<string, string | undefined>,
  passphrase = PAYFAST_PASSPHRASE
): string {
  const queryString = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v!)).replace(/%20/g, "+")}`)
    .join("&");

  const base = passphrase
    ? `${queryString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`
    : queryString;

  return crypto.createHash("md5").update(base).digest("hex");
}

/**
 * Verify a PayFast ITN (Instant Transaction Notification).
 * Returns true if the notification is authentic and the amount matches.
 */
export async function verifyITN(params: {
  itnData:        Record<string, string>;
  expectedAmount: number;
  sourceIp:       string;
}): Promise<{ valid: boolean; reason?: string }> {
  const { itnData, expectedAmount, sourceIp } = params;

  // 1. IP check
  if (!PAYFAST_ITN_IPS.includes(sourceIp)) {
    return { valid: false, reason: `Untrusted IP: ${sourceIp}` };
  }

  // 2. Signature check
  const { signature: receivedSig, ...dataWithoutSig } = itnData;
  const computedSig = generateSignature(dataWithoutSig);
  if (computedSig !== receivedSig) {
    return { valid: false, reason: "Signature mismatch" };
  }

  // 3. Amount check (allow ±1 cent rounding)
  const receivedAmount = parseFloat(itnData.amount_gross ?? "0");
  if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
    return {
      valid: false,
      reason: `Amount mismatch: expected ${expectedAmount}, got ${receivedAmount}`,
    };
  }

  // 4. Server-side validation with PayFast
  try {
    const body = Object.entries(itnData)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const res = await fetch(`${PAYFAST_HOST}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await res.text();
    if (!text.includes("VALID")) {
      return { valid: false, reason: `PayFast server validation failed: ${text}` };
    }
  } catch (e) {
    return { valid: false, reason: `PayFast validation request failed: ${e}` };
  }

  return { valid: true };
}
