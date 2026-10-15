import { APIError } from "better-auth/api";

export interface SignInFailure {
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
      message: "Please verify your email address before signing in.",
      errors: { email: "Email verification is required" },
      status: 403,
    };
  }

  // Better Auth reaches this only after checking the password and email
  // verification. Activation and production-account hooks can deny a session.
  if (errorCode === "FAILED_TO_CREATE_SESSION") {
    return {
      message: "Your account could not start a session. Please contact support to check account activation and production access.",
      status: 403,
    };
  }

  const status = error.statusCode === 403 ? 403 : 401;
  return {
    message:
      status === 403
        ? "Your account cannot sign in. Please contact support."
        : "Invalid email or password.",
    status,
  };
}
