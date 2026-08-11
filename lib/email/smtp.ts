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
