import crypto from "crypto";

const SANDBOX_MERCHANT_ID = "10000100";
const SANDBOX_MERCHANT_KEY = "46f0cd694581a";
// PayFast's shared 10000100 sandbox account is the no-passphrase credential
// set. Mixing it with a passphrase produces an invalid form signature.
const SANDBOX_PASSPHRASE = "";

const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX !== "false";

export const PAYFAST_HOST = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za"
  : "https://www.payfast.co.za";

// Current PayFast-published IPv4 ranges. Keep these as CIDRs so the complete
// ranges are accepted rather than a brittle list of individual addresses.
const PAYFAST_ITN_CIDRS = [
  "197.97.145.144/28",
  "41.74.179.192/27",
  "102.216.36.0/28",
  "102.216.36.128/28",
  "144.126.193.139/32",
];

export interface PayFastConfig {
  sandbox: boolean;
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  host: string;
  appUrl?: string;
}

export interface PayFastPaymentData {
  [key: string]: string | undefined;
  merchant_id: string;
  merchant_key: string;
  return_url?: string;
  cancel_url?: string;
  notify_url?: string;
  name_first: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  custom_str1?: string;
  custom_str2?: string;
}

/**
 * Resolve a coherent PayFast configuration.
 *
 * PayFast publishes a complete shared credential set for sandbox testing. If
 * custom sandbox credentials are incomplete, use that entire set (including
 * its matching passphrase) rather than mixing unrelated credentials.
 */
export function getPayFastConfig(): PayFastConfig {
  const sandbox = process.env.PAYFAST_SANDBOX !== "false";
  const configuredId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const configuredKey = process.env.PAYFAST_MERCHANT_KEY?.trim();
  const hasCustomCredentials = Boolean(configuredId && configuredKey);

  if (!sandbox && !hasCustomCredentials) {
    throw new Error(
      "PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY are required in live mode."
    );
  }

  const appUrl = (
    process.env.PAYFAST_APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  ).replace(/\/$/, "");

  return {
    sandbox,
    merchantId: hasCustomCredentials ? configuredId! : SANDBOX_MERCHANT_ID,
    merchantKey: hasCustomCredentials ? configuredKey! : SANDBOX_MERCHANT_KEY,
    passphrase: hasCustomCredentials
      ? process.env.PAYFAST_PASSPHRASE?.trim() ?? ""
      : SANDBOX_PASSPHRASE,
    host: sandbox ? "https://sandbox.payfast.co.za" : "https://www.payfast.co.za",
    appUrl: appUrl || undefined,
  };
}

function isPublicCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "::1" &&
      !hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

/** Local sandbox checkouts cannot receive PayFast redirects or ITNs. */
export function isLocalPayFastDemo(): boolean {
  const config = getPayFastConfig();
  return config.sandbox && !Boolean(config.appUrl && isPublicCallbackUrl(config.appUrl));
}

/** PHP-compatible urlencode used by PayFast's custom integration signatures. */
export function encodePayFastValue(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/[!'()*~]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    )
    .replace(/%20/g, "+");
}

/** Build the redirect form and append its MD5 security signature. */
export function buildPaymentData(params: {
  paymentId: number;
  deliveryId: number;
  trackingNumber: string;
  amount: number;
  customerName: string;
  customerEmail: string;
}): PayFastPaymentData & { signature: string } {
  const config = getPayFastConfig();

  const data: Record<string, string | undefined> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
  };

  // PayFast rejects localhost URLs. They are optional, so omit them for local
  // form testing; a public HTTPS URL is required for redirect and ITN testing.
  if (config.appUrl && isPublicCallbackUrl(config.appUrl)) {
    data.return_url = `${config.appUrl}/dashboard?payment=success&delivery=${params.deliveryId}&payment_id=${params.paymentId}`;
    data.cancel_url = `${config.appUrl}/dashboard?payment=cancelled&delivery=${params.deliveryId}`;
    data.notify_url = `${config.appUrl}/api/payments/callback`;
  }

  data.name_first = params.customerName.trim().split(/\s+/)[0] || "Customer";
  data.email_address = params.customerEmail.trim();
  data.m_payment_id = String(params.paymentId);
  data.amount = params.amount.toFixed(2);
  data.item_name = `EzyGo Delivery ${params.trackingNumber}`;
  data.custom_str1 = String(params.deliveryId);
  data.custom_str2 = params.trackingNumber;

  return {
    ...data,
    signature: generateSignature(data, config.passphrase),
  } as PayFastPaymentData & { signature: string };
}

/** Generate the ordered MD5 signature required by PayFast custom payments. */
export function generateSignature(
  data: Record<string, string | undefined>,
  passphrase = getPayFastConfig().passphrase
): string {
  const queryString = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${encodePayFastValue(String(value))}`)
    .join("&");

  const base = passphrase.trim()
    ? `${queryString}&passphrase=${encodePayFastValue(passphrase)}`
    : queryString;

  return crypto.createHash("md5").update(base).digest("hex");
}

function ipv4ToInteger(ip: string): number | null {
  const parts = ip.replace(/^::ffff:/, "").split(".");
  if (parts.length !== 4) return null;

  const octets = parts.map(Number);
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return octets.reduce((result, part) => ((result << 8) | part) >>> 0, 0);
}

export function isTrustedPayFastIp(ip: string): boolean {
  const address = ipv4ToInteger(ip.trim());
  if (address === null) return false;

  return PAYFAST_ITN_CIDRS.some((cidr) => {
    const [networkIp, prefixText] = cidr.split("/");
    const network = ipv4ToInteger(networkIp);
    const prefix = Number(prefixText);
    if (network === null || !Number.isInteger(prefix)) return false;

    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (address & mask) >>> 0 === (network & mask) >>> 0;
  });
}

/** Verify the signature, source, amount, and PayFast server validation. */
export async function verifyITN(params: {
  itnData: Record<string, string>;
  expectedAmount: number;
  sourceIp: string;
}): Promise<{ valid: boolean; reason?: string }> {
  const { itnData, expectedAmount, sourceIp } = params;
  const config = getPayFastConfig();

  // Some reverse proxies do not preserve PayFast's original address. In the
  // no-money sandbox we can rely on the remaining signature, merchant, amount,
  // and PayFast server checks. Live mode always requires a trusted source IP.
  if (!config.sandbox && !isTrustedPayFastIp(sourceIp)) {
    return { valid: false, reason: `Untrusted PayFast source IP: ${sourceIp}` };
  }

  if (itnData.merchant_id !== config.merchantId) {
    return { valid: false, reason: "Merchant ID mismatch" };
  }

  const { signature: receivedSignature, ...unsignedData } = itnData;
  if (!receivedSignature) {
    return { valid: false, reason: "Missing signature" };
  }

  const computedSignature = generateSignature(unsignedData, config.passphrase);
  const signaturesMatch =
    receivedSignature.length === computedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(receivedSignature.toLowerCase()),
      Buffer.from(computedSignature)
    );

  if (!signaturesMatch) {
    return { valid: false, reason: "Signature mismatch" };
  }

  const receivedAmount = Number(itnData.amount_gross);
  if (
    !Number.isFinite(receivedAmount) ||
    Math.abs(receivedAmount - expectedAmount) > 0.01
  ) {
    return {
      valid: false,
      reason: `Amount mismatch: expected ${expectedAmount}, got ${itnData.amount_gross}`,
    };
  }

  try {
    const validationBody = Object.entries(unsignedData)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => `${key}=${encodePayFastValue(value)}`)
      .join("&");

    const response = await fetch(`${config.host}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: validationBody,
      signal: AbortSignal.timeout(10_000),
    });
    const validationResult = (await response.text()).trim();

    if (!response.ok || validationResult !== "VALID") {
      return {
        valid: false,
        reason: `PayFast server validation failed: ${validationResult || response.status}`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      reason: `PayFast validation request failed: ${String(error)}`,
    };
  }

  return { valid: true };
}
