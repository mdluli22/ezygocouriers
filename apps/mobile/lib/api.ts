import { createApiClient } from "@ezygo/api-client";

// Supply a secure-storage reader when native sign-in is implemented.
export function createMobileApi(getAccessToken?: () => Promise<string | null>, onUnauthorized?: () => void | Promise<void>) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("Set EXPO_PUBLIC_API_URL in apps/mobile/.env.local.");
  return createApiClient({ baseUrl, credentials: "omit", getAccessToken, onUnauthorized });
}
