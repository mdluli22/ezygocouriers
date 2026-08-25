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

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const drivers = await getAdminDrivers();
    return successResponse("Drivers fetched.", drivers);
  } catch (error) {
    console.error("[GET /api/admin/drivers]", error);
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const body = await req.json();
    const {
      full_name, email, phone, password,
      license_number, vehicle_type, vehicle_reg,
    } = body;

    const requiredFields = {
      full_name, email, phone, password,
      license_number, vehicle_type, vehicle_reg,
    };
    const hasMissingField = Object.values(requiredFields).some(
      (value) => typeof value !== "string" || value.trim() === ""
    );

    if (hasMissingField) {
      return errorResponse("All fields are required.", undefined, 422);
    }

    const normalizedEmail = email.trim();
    const password_hash = await hashPassword(password);
    const result = await createDriver({
      full_name: full_name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password_hash,
      license_number: license_number.trim(),
      vehicle_type: vehicle_type.trim(),
      vehicle_reg: vehicle_reg.trim(),
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
      console.error("[Driver verification email]", emailError);
    }

    return successResponse(
      verificationEmailSent
        ? "Driver account created. A verification code was emailed to the driver."
        : "Driver account created, but the verification email could not be sent.",
      { ...result, verification_email_sent: verificationEmailSent },
      201
    );
  } catch (error: unknown) {
    console.error("[POST /api/admin/drivers]", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return errorResponse("A user with this email already exists.", undefined, 409);
    }
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "admin") return forbiddenResponse();

    const body = await req.json();
    const { driver_id } = body;

    if (!driver_id) return errorResponse("driver_id is required.", undefined, 422);

    await toggleDriverStatus(Number(driver_id));
    return successResponse("Driver status toggled.");
  } catch (error) {
    console.error("[PATCH /api/admin/drivers]", error);
    return serverErrorResponse();
  }
}
