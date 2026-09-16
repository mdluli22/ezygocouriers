import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api/response";

export type ParsedRequest<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
  }

  return fieldErrors;
}

export async function parseJsonRequest<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  message = "Please fix the errors below."
): Promise<ParsedRequest<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: errorResponse(
        "Request body must contain valid JSON.",
        undefined,
        400,
        "INVALID_JSON"
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: errorResponse(
        message,
        formatValidationErrors(parsed.error),
        422,
        "VALIDATION_ERROR"
      ),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>
): ParsedRequest<T> {
  const values = Object.fromEntries(searchParams.entries());
  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      response: errorResponse(
        "Invalid query parameters.",
        formatValidationErrors(parsed.error),
        422,
        "VALIDATION_ERROR"
      ),
    };
  }

  return { success: true, data: parsed.data };
}

