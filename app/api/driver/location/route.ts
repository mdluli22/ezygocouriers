import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateDriverLocation } from "@/lib/services/driver-assignment";
import {
  errorResponse,
  forbiddenResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api/response";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();
    if (session.role !== "driver") return forbiddenResponse();

    const parsed = locationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse("Invalid driver location.", undefined, 422);
    }

    const assignment = await updateDriverLocation({
      driverUserId: session.userId,
      ...parsed.data,
    });

    return successResponse(
      assignment
        ? "Location updated and a delivery was assigned."
        : "Location updated.",
      { assignment }
    );
  } catch (error) {
    console.error("[PATCH /api/driver/location]", error);
    return serverErrorResponse("Failed to update driver location.");
  }
}
