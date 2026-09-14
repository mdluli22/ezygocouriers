import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/auth";
import { query } from "@/lib/db/server";
import {
  isRecipientRejected,
  isSmtpConfigured,
  sendAuthOtp,
  verifySmtpConnection,
} from "@/lib/email/smtp";
import type { SignupInput } from "@ezygo/contracts";

export class EmailRegistrationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string>
  ) {
    super(message);
    this.name = "EmailRegistrationError";
  }
}

export async function registerEmailUser(
  input: SignupInput,
  requestHeaders: Headers
) {
  const { full_name, email, phone, password } = input;

  if (!isSmtpConfigured()) {
    throw new EmailRegistrationError(
      "Email verification is temporarily unavailable. SMTP credentials are missing or still use placeholder values.",
      503
    );
  }

  try {
    await verifySmtpConnection();
  } catch (error) {
    console.error("[Signup SMTP verification]", error);
    throw new EmailRegistrationError(
      "Email verification is temporarily unavailable because the mail server could not be reached or rejected its credentials.",
      503
    );
  }

  const existing = await query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new EmailRegistrationError(
      "An account with this email already exists.",
      409,
      { email: "Email is already registered" }
    );
  }

  try {
    const otp = await auth.api.createVerificationOTP({
      body: { email, type: "email-verification" },
      headers: requestHeaders,
    });
    await sendAuthOtp({ to: email, otp, type: "email-verification" });
  } catch (error) {
    console.error("[Signup verification email]", error);
    const recipientRejected = isRecipientRejected(error);
    throw new EmailRegistrationError(
      recipientRejected
        ? "The email provider rejected this recipient address. Check the address and domain, then try again."
        : "The verification email could not be delivered. Please try again later.",
      recipientRejected ? 422 : 502,
      recipientRejected
        ? { email: "This email address could not receive mail." }
        : undefined
    );
  }

  return auth.api.signUpEmail({
    body: {
      name: full_name,
      email,
      password,
      phone: phone || undefined,
    },
    headers: requestHeaders,
    returnHeaders: true,
  });
}

export function normalizeRegistrationError(
  error: unknown
): EmailRegistrationError | null {
  if (error instanceof EmailRegistrationError) return error;

  if (error instanceof APIError) {
    if (error.statusCode === 409 || error.statusCode === 422) {
      return new EmailRegistrationError(
        "An account with this email already exists.",
        409,
        { email: "Email is already registered" }
      );
    }

    return new EmailRegistrationError(
      error.message || "Unable to create account.",
      error.statusCode
    );
  }

  return null;
}
