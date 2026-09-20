import { createApiClient } from "@ezygo/api-client";
import type { Transport } from "./auth/session-controller";

export function createMobileApi(getAccessToken?: () => Promise<string | null>, onUnauthorized?: () => void | Promise<void>) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("Sign-in is unavailable. Please try again later.");
  if (!__DEV__ && !baseUrl.startsWith("https://")) throw new Error("A secure connection is required.");
  return createApiClient({ baseUrl, credentials: "omit", getAccessToken, onUnauthorized });
}

export const mobileTransport: Transport = async <T>(path: string, method: "GET" | "POST", body?: unknown, token?: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const result = await createMobileApi().request<T>(path, {
      method, signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return result.data;
  } finally { clearTimeout(timeout); }
};
