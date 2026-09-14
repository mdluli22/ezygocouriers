import { NextResponse } from "next/server";
import {
  API_CONTRACT_VERSION,
  API_CONTRACT_VERSION_HEADER,
  ApiErrorCode,
  ApiFailure,
  ApiSuccess,
} from "@ezygo/contracts";

function defaultErrorCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  if (status >= 500) return "INTERNAL_ERROR";
  return "BAD_REQUEST";
}

const contractHeaders = {
  [API_CONTRACT_VERSION_HEADER]: API_CONTRACT_VERSION,
};

/**
 * Return a consistent success JSON response.
 */
export function successResponse<T>(
  message: string,
  data?: T,
  status: number = 200
) {
  return NextResponse.json<ApiSuccess<T | null>>(
    { success: true, message, data: data ?? null },
    { status, headers: contractHeaders }
  );
}

/**
 * Return a consistent error JSON response.
 */
export function errorResponse(
  message: string,
  errors?: Record<string, string>,
  status: number = 400,
  code: ApiErrorCode = defaultErrorCode(status)
) {
  return NextResponse.json<ApiFailure>(
    { success: false, code, message, errors: errors ?? null },
    { status, headers: contractHeaders }
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
