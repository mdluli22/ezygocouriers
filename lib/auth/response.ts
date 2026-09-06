import { NextResponse } from "next/server";

/**
 * Better Auth's server API returns Set-Cookie headers separately. Copy every
 * cookie onto a compatibility response so existing frontend calls can keep
 * their current JSON contract during the migration.
 */
export function applyAuthCookies(
  response: NextResponse,
  authHeaders: Headers
): NextResponse {
  for (const cookie of authHeaders.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

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
