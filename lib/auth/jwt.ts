import jwt from "jsonwebtoken";

// Defer secret access to runtime — never throw at module evaluation time
// so the Docker build step (which has no env vars) can still collect page data.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("[Auth] JWT_SECRET environment variable is not set.");
  return secret;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JWTPayload {
  userId: number;
  email: string;
  role: "customer" | "driver" | "admin";
}

/**
 * Sign a JWT token for a user session.
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token.
 * Returns null if invalid or expired.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}
