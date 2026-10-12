import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

function key(): Buffer {
  const secret = process.env.NOTIFICATION_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("A strong notification encryption secret is required.");
  return createHash("sha256").update(`ezygo:outbox:v1:${secret}`).digest();
}
export function encryptPayload(payload: unknown): string {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString("base64url")).join(".");
}
export function decryptPayload<T>(encrypted: string): T {
  const [iv,tag,data] = encrypted.split(".").map(s => Buffer.from(s, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8")) as T;
}
