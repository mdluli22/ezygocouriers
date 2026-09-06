import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateDeliveryStatus } from "@/lib/services/drivers";
import { DELIVERY_STATUSES } from "@/lib/constants/delivery-status";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api/response";

const statusUpdateSchema = z.object({
  delivery_id: z.number().int().positive("Invalid delivery ID."),
  status: z.enum(DELIVERY_STATUSES, {
    error: () => ({ message: "Invalid delivery status." }),
  }),
  note: z.string().max(500).optional(),
  pin: z.string().regex(/^\d{6}$/, "Enter the six-digit delivery PIN.").optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const body = await req.json();
    const result = statusUpdateSchema.safeParse(body);

    if (!result.success) {
      const errors = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? "Invalid"])
      );
      return errorResponse("Invalid request.", errors, 422);
    }

    const { delivery_id, status, note, pin } = result.data;

    await updateDeliveryStatus(delivery_id, session.userId, status, note, pin);

    return successResponse(`Delivery status updated to '${status}'.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("not assigned") ||
        error.message.includes("Cannot transition") ||
        error.message.includes("not found") ||
        error.message.includes("PIN")
      ) {
        return errorResponse(error.message, undefined, 400);
      }
    }
    console.error("[PATCH /api/driver/status]", error);
    return serverErrorResponse();
  }
}
