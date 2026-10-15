import { NextRequest } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/auth";
import { mobileSendVerificationSchema } from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";
import {
  errorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  captureSmtpDelivery,
  isSmtpConfigured,
  verifySmtpConnection,
} from "@/lib/email/smtp";
import { secureMobileResponse } from "@/lib/auth/mobile-session";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonRequest(
      request,
      mobileSendVerificationSchema
    );
    if (!parsed.success) return secureMobileResponse(parsed.response);

    if (!isSmtpConfigured()) {
      return secureMobileResponse(
        errorResponse("Email delivery is temporarily unavailable.", undefined, 503)
      );
    }

    await verifySmtpConnection();
    const delivery = await captureSmtpDelivery(() =>
      auth.api.sendVerificationOTP({
        body: { email: parsed.data.email, type: "email-verification" },
        headers: request.headers,
      })
    );
    if (delivery.failure) {
      return secureMobileResponse(
        errorResponse(
          "The verification email could not be delivered.",
          undefined,
          502
        )
      );
    }

    return secureMobileResponse(
      successResponse("If the account can be verified, a new code was sent.")
    );
  } catch (error) {
    if (error instanceof APIError) {
      return secureMobileResponse(
        successResponse("If the account can be verified, a new code was sent.")
      );
    }

    console.error("[POST /api/mobile/v1/auth/send-verification]", error);
    return secureMobileResponse(
      errorResponse(
        "The verification email could not be sent.",
        undefined,
        502
      )
    );
  }
}
