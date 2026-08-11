import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  captureSmtpDelivery,
  isSmtpConfigured,
  verifySmtpConnection,
} from "@/lib/email/smtp";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  const sendsVerificationOtp = request.nextUrl.pathname.endsWith(
    "/email-otp/send-verification-otp"
  );

  if (sendsVerificationOtp) {
    if (!isSmtpConfigured()) {
      return NextResponse.json(
        {
          code: "SMTP_NOT_CONFIGURED",
          message: "Email delivery is unavailable because SMTP is not configured.",
        },
        { status: 503 }
      );
    }

    try {
      await verifySmtpConnection();
    } catch (emailError) {
      console.error("[Verification OTP SMTP preflight]", emailError);
      return NextResponse.json(
        {
          code: "SMTP_UNAVAILABLE",
          message:
            "The verification email could not be sent. Please contact support or try again later.",
        },
        { status: 503 }
      );
    }
    const delivery = await captureSmtpDelivery(() => handlers.POST(request));
    if (delivery.failure) {
      const recipientRejected =
        delivery.failure.code === "EENVELOPE" ||
        delivery.failure.responseCode === 550;
      return NextResponse.json(
        {
          code: recipientRejected
            ? "RECIPIENT_REJECTED"
            : "EMAIL_DELIVERY_FAILED",
          message: recipientRejected
            ? "The email provider rejected this recipient address. Check the address and domain."
            : "The verification email could not be delivered. Please try again later.",
        },
        { status: recipientRejected ? 422 : 502 }
      );
    }

    return delivery.result;
  }

  return handlers.POST(request);
}
