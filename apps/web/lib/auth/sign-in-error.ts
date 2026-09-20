import type { ApiErrorCode } from "@ezygo/contracts";
import { APIError } from "better-auth/api";

export interface SignInFailure {
  code: ApiErrorCode;
  message: string;
  status: number;
  errors?: Record<string, string>;
}

export function normalizeSignInError(error: unknown): SignInFailure | null {
  if (!(error instanceof APIError)) return null;

  const errorCode =
    typeof error.body === "object" && error.body && "code" in error.body
      ? String(error.body.code)
      : "";

  if (errorCode === "EMAIL_NOT_VERIFIED") {
    return {
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email address before signing in.",
      errors: { email: "Email verification is required" },
      status: 403,
    };
  }

  if (error.statusCode === 429) return {
    code: "RATE_LIMITED", status: 429, message: "Too many requests. Please try again later.",
  };
  const status = error.statusCode === 403 ? 403 : 401;
  return {
    code: status === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
    message:
      status === 403
        ? "Your account cannot sign in. Please contact support."
        : "Invalid email or password.",
    status,
  };
}
