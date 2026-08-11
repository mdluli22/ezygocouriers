import { NextRequest } from "next/server";
import { APIError } from "better-auth/api";
import { signupSchema } from "@/lib/validations/auth";
import { query } from "@/lib/db/server";
import { auth } from "@/lib/auth/auth";
import { applyAuthCookies } from "@/lib/auth/response";
import {
  isRecipientRejected,
  isSmtpConfigured,
  sendAuthOtp,
  verifySmtpConnection,
} from "@/lib/email/smtp";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const formatted = Object.fromEntries(
        Object.entries(errors).map(([k, v]) => [k, v?.[0] ?? "Invalid"])
      );
      return errorResponse("Please fix the errors below.", formatted, 422);
    }

    const { full_name, email, phone, password } = result.data;

    if (!isSmtpConfigured()) {
      return errorResponse(
        "Email verification is temporarily unavailable. SMTP credentials are missing or still use placeholder values.",
        undefined,
        503
      );
    }

    try {
      await verifySmtpConnection();
    } catch (emailError) {
      console.error("[Signup SMTP verification]", emailError);
      return errorResponse(
        "Email verification is temporarily unavailable because the mail server could not be reached or rejected its credentials.",
        undefined,
        503
      );
    }

    // 2. Check if email already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return errorResponse(
        "An account with this email already exists.",
        { email: "Email is already registered" },
        409
      );
    }

    try {
      const otp = await auth.api.createVerificationOTP({
        body: { email, type: "email-verification" },
        headers: req.headers,
      });
      await sendAuthOtp({ to: email, otp, type: "email-verification" });
    } catch (emailError) {
      console.error("[Signup verification email]", emailError);
      const recipientRejected = isRecipientRejected(emailError);
      return errorResponse(
        recipientRejected
          ? "The email provider rejected this recipient address. Check the address and domain, then try again."
          : "The verification email could not be delivered. Please try again later.",
        recipientRejected
          ? { email: "This email address could not receive mail." }
          : undefined,
        recipientRejected ? 422 : 502
      );
    }

    const signUp = await auth.api.signUpEmail({
      body: {
        name: full_name,
        email,
        password,
        phone: phone || undefined,
      },
      headers: req.headers,
      returnHeaders: true,
    });

    const response = successResponse(
      "Account created. Enter the verification code sent to your email.",
      {
        id: Number(signUp.response.user.id),
        full_name: signUp.response.user.name,
        email: signUp.response.user.email,
        role: signUp.response.user.role,
        requires_verification: true,
      },
      201
    );
    return applyAuthCookies(response, signUp.headers);
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 409 || error.statusCode === 422) {
        return errorResponse(
          "An account with this email already exists.",
          { email: "Email is already registered" },
          409
        );
      }
      return errorResponse(error.message || "Unable to create account.", undefined, error.statusCode);
    }
    console.error("[POST /api/auth/signup]", error);
    return serverErrorResponse("Something went wrong. Please try again.");
  }
}
