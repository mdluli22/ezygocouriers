import { logServerError } from "@/lib/api/context";
import { withApiRoute } from "@/lib/api/route";
import { getSession } from "@/lib/auth/session";
import { getAdminDrivers, createDriver, toggleDriverStatus } from "@/lib/services/admin";
import { hashPassword } from "@/lib/auth/password";
import { auth } from "@/lib/auth/auth";
import { sendAuthOtp } from "@/lib/email/smtp";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";
import { NextRequest } from "next/server";
import {
  adminCreateDriverSchema,
  adminToggleDriverSchema,
} from "@ezygo/contracts";
import { parseJsonRequest } from "@/lib/api/validation";

async function handleGET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const drivers = await getAdminDrivers();
    return successResponse("Drivers fetched.", drivers);
  } catch (error) {
    logServerError("[GET /api/admin/drivers]", error);
    return serverErrorResponse();
  }
}

async function handlePOST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = await parseJsonRequest(req, adminCreateDriverSchema);
    if (!parsed.success) return parsed.response;
    const {
      full_name, email: normalizedEmail, phone, password,
      license_number, vehicle_type, vehicle_reg,
    } = parsed.data;

    const password_hash = await hashPassword(password);
    const result = await createDriver({
      full_name,
      email: normalizedEmail,
      phone,
      password_hash,
      license_number,
      vehicle_type,
      vehicle_reg,
    });

    let verificationEmailSent = true;
    try {
      const otp = await auth.api.createVerificationOTP({
        body: { email: normalizedEmail, type: "email-verification" },
        headers: req.headers,
      });
      await sendAuthOtp({ to: normalizedEmail, otp, type: "email-verification" });
    } catch (emailError) {
      verificationEmailSent = false;
      logServerError("[Driver verification email]", emailError);
    }

    return successResponse(
      verificationEmailSent
        ? "Driver account created. A verification code was emailed to the driver."
        : "Driver account created, but the verification email could not be sent.",
      { ...result, verification_email_sent: verificationEmailSent },
      201
    );
  } catch (error: unknown) {
    logServerError("[POST /api/admin/drivers]", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return errorResponse("A user with this email already exists.", undefined, 409);
    }
    return serverErrorResponse();
  }
}

async function handlePATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const parsed = await parseJsonRequest(req, adminToggleDriverSchema);
    if (!parsed.success) return parsed.response;

    await toggleDriverStatus(parsed.data.driver_id);
    return successResponse("Driver status toggled.");
  } catch (error) {
    logServerError("[PATCH /api/admin/drivers]", error);
    return serverErrorResponse();
  }
}

export const GET = withApiRoute("/api/admin/drivers", handleGET);
export const POST = withApiRoute("/api/admin/drivers", handlePOST);
export const PATCH = withApiRoute("/api/admin/drivers", handlePATCH);
