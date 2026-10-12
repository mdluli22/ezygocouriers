import { NextResponse } from "next/server";
import { RateLimitError } from "@/lib/security/rate-limit";
export class BusinessError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}
export function applicationErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof RateLimitError) return NextResponse.json({success:false,message:error.message}, {status:429,headers:{"Retry-After":String(error.retryAfter),"Cache-Control":"no-store"}});
  if (error instanceof BusinessError) return NextResponse.json({success:false,message:error.message}, {status:error.status});
  return null;
}
