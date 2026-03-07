import { NextResponse } from "next/server";

/**
 * Return a consistent success JSON response.
 */
export function successResponse<T>(
  message: string,
  data?: T,
  status: number = 200
) {
  return NextResponse.json(
    { success: true, message, data: data ?? null },
    { status }
  );
}

/**
 * Return a consistent error JSON response.
 */
export function errorResponse(
  message: string,
  errors?: Record<string, string>,
  status: number = 400
) {
  return NextResponse.json(
    { success: false, message, errors: errors ?? null },
    { status }
  );
}

/**
 * Return a 401 Unauthorized response.
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return errorResponse(message, undefined, 401);
}

/**
 * Return a 403 Forbidden response.
 */
export function forbiddenResponse(message = "Forbidden") {
  return errorResponse(message, undefined, 403);
}

/**
 * Return a 404 Not Found response.
 */
export function notFoundResponse(message = "Not found") {
  return errorResponse(message, undefined, 404);
}

/**
 * Return a 500 Internal Server Error response.
 */
export function serverErrorResponse(message = "Internal server error") {
  return errorResponse(message, undefined, 500);
}
