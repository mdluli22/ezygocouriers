import { AsyncLocalStorage } from "node:async_hooks";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let smtpVerifiedAt = 0;
let smtpVerification: Promise<void> | null = null;

const SMTP_VERIFICATION_TTL_MS = 5 * 60 * 1000;
type SmtpDeliveryFailure = {
  code?: string;
  message: string;
  responseCode?: number;
};

const smtpDeliveryContext = new AsyncLocalStorage<{
  failure: SmtpDeliveryFailure | null;
}>();
const PLACEHOLDER_VALUES = new Set([
  "changeme",
  "password",
  "replace-me",
  "your-password",
  "your-smtp-password",
  "your-smtp-user",
]);

function isConfiguredValue(value: string | undefined): value is string {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && !PLACEHOLDER_VALUES.has(normalized));
}

function normalizeDeliveryFailure(error: unknown): SmtpDeliveryFailure {
  if (error instanceof Error) {
    const smtpError = error as Error & {
      code?: string;
      responseCode?: number;
    };
    return {
      code: smtpError.code,
      message: smtpError.message,
      responseCode: smtpError.responseCode,
    };
  }

  return { message: "Unknown email delivery failure" };
}

export function isRecipientRejected(error: unknown): boolean {
  const failure = normalizeDeliveryFailure(error);
  return failure.code === "EENVELOPE" || failure.responseCode === 550;
}

export async function captureSmtpDelivery<T>(
  operation: () => Promise<T>
): Promise<{ failure: SmtpDeliveryFailure | null; result: T }> {
  const state = { failure: null as SmtpDeliveryFailure | null };
  const result = await smtpDeliveryContext.run(state, operation);
  return { failure: state.failure, result };
}

export function isSmtpConfigured(): boolean {
  return (
    isConfiguredValue(process.env.SMTP_HOST) &&
    isConfiguredValue(process.env.SMTP_USER) &&
    isConfiguredValue(process.env.SMTP_PASSWORD || process.env.SMTP_PASS)
  );
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const missingOrPlaceholder = [
    !isConfiguredValue(host) && "SMTP_HOST",
    !isConfiguredValue(user) && "SMTP_USER",
    !isConfiguredValue(password) && "SMTP_PASSWORD",
  ].filter(Boolean);

  if (missingOrPlaceholder.length > 0) {
    throw new Error(
      `[Email] Missing or placeholder SMTP configuration: ${missingOrPlaceholder.join(", ")}`
    );
  }

  if (secure && port === 587) {
    throw new Error(
      "[Email] Invalid SMTP TLS configuration: port 587 requires SMTP_SECURE=false (STARTTLS). Use port 465 with SMTP_SECURE=true for implicit TLS."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return transporter;
}

/**
 * Confirm that the SMTP server accepts the configured credentials before an
 * operation (such as signup) promises that an email can be delivered.
 */
export async function verifySmtpConnection(): Promise<void> {
  if (Date.now() - smtpVerifiedAt < SMTP_VERIFICATION_TTL_MS) return;

  if (!smtpVerification) {
    smtpVerification = getTransporter()
      .verify()
      .then(() => {
        smtpVerifiedAt = Date.now();
      })
      .finally(() => {
        smtpVerification = null;
      });
  }

  await smtpVerification;
}

export async function sendAuthOtp({
  to,
  otp,
  type,
}: {
  to: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}): Promise<void> {
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER;
  if (!from) {
    throw new Error("[Email] Missing SMTP_FROM or SMTP_USER.");
  }

  const purpose =
    type === "email-verification"
      ? "verify your email address"
      : type === "forget-password"
        ? "reset your password"
        : type === "change-email"
          ? "confirm your new email address"
        : "sign in";

  try {
    await getTransporter().sendMail({
      from,
      to,
      subject: `${otp} is your EzyGo verification code`,
      text: [
        `Use this code to ${purpose}:`,
        "",
        otp,
        "",
        "This code expires in 10 minutes. If you did not request it, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#172033">
          <h1 style="font-size:24px;margin:0 0 16px">EzyGo verification</h1>
          <p style="line-height:1.6">Use the code below to ${purpose}.</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:10px;padding:20px 24px;margin:24px 0;background:#f4f6f8;border-radius:12px;text-align:center">
            ${otp}
          </div>
          <p style="font-size:14px;color:#667085;line-height:1.6">
            This code expires in 10 minutes. If you did not request it, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    const deliveryState = smtpDeliveryContext.getStore();
    if (deliveryState) {
      deliveryState.failure = normalizeDeliveryFailure(error);
    }
    throw error;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function sendDeliveryPin({
  to,
  recipientName,
  trackingNumber,
  pin,
}: {
  to: string;
  recipientName: string;
  trackingNumber: string;
  pin: string;
}): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("[Email] Missing SMTP_FROM or SMTP_USER.");

  const safeName = escapeHtml(recipientName);
  const safeTrackingNumber = escapeHtml(trackingNumber);

  await getTransporter().sendMail({
    from,
    to,
    subject: `${pin} is your EzyGo delivery PIN`,
    text: [
      `Hi ${recipientName},`,
      "",
      `Your delivery PIN for ${trackingNumber} is ${pin}.`,
      "",
      "Give this PIN to the EzyGo driver only when the parcel is handed to you. EzyGo staff will never ask for it before delivery.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#172033">
        <p style="color:#0f766e;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px">EzyGo secure handover</p>
        <h1 style="font-size:24px;margin:0 0 12px">Your parcel is protected by a PIN</h1>
        <p style="line-height:1.6">Hi ${safeName}, use this code when your EzyGo driver hands over delivery <strong>${safeTrackingNumber}</strong>.</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:10px;padding:20px 24px;margin:24px 0;background:#f4f6f8;border-radius:12px;text-align:center">${pin}</div>
        <p style="font-size:14px;color:#667085;line-height:1.6">Only share this PIN once the parcel is physically with you. EzyGo staff will never ask for it before delivery.</p>
      </div>
    `,
  });
}

export async function sendDeliveryCompleted({
  to,
  customerName,
  trackingNumber,
  recipientName,
}: {
  to: string;
  customerName: string;
  trackingNumber: string;
  recipientName: string;
}): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("[Email] Missing SMTP_FROM or SMTP_USER.");

  const safeCustomerName = escapeHtml(customerName);
  const safeTrackingNumber = escapeHtml(trackingNumber);
  const safeRecipientName = escapeHtml(recipientName);

  await getTransporter().sendMail({
    from,
    to,
    subject: `Delivered successfully: ${trackingNumber}`,
    text: [
      `Hi ${customerName},`,
      "",
      `Your EzyGo delivery ${trackingNumber} has been delivered successfully to ${recipientName}.`,
      "",
      "Thank you for choosing EzyGo Couriers.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#172033">
        <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase">Delivered successfully</div>
        <h1 style="font-size:26px;margin:20px 0 12px;color:#173d38">Your delivery has arrived</h1>
        <p style="line-height:1.7">Hi ${safeCustomerName}, your EzyGo delivery <strong>${safeTrackingNumber}</strong> has been handed over successfully to <strong>${safeRecipientName}</strong>.</p>
        <div style="margin:24px 0;padding:18px 20px;border-radius:14px;background:#f4f7f5;border-left:4px solid #16a34a">
          <div style="font-size:12px;color:#667085;text-transform:uppercase;letter-spacing:1px;font-weight:700">Tracking number</div>
          <div style="font-size:20px;font-weight:800;margin-top:5px;color:#173d38">${safeTrackingNumber}</div>
        </div>
        <p style="font-size:14px;color:#667085;line-height:1.6">Thank you for choosing EzyGo Couriers.</p>
      </div>
    `,
  });
}
