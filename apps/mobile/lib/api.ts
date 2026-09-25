import { createApiClient } from "@ezygo/api-client";
import { resolveApiOrigin } from "./api-config";
import type { Transport } from "./auth/session-controller";

export function getMobileApiOrigin() {
  return resolveApiOrigin(process.env.EXPO_PUBLIC_API_URL, __DEV__);
}

export function createMobileApi(getAccessToken?: () => Promise<string | null>, onUnauthorized?: () => void | Promise<void>) {
  const baseUrl = getMobileApiOrigin();
  return createApiClient({ baseUrl, credentials: "omit", getAccessToken, onUnauthorized });
}

export const mobileTransport: Transport = async <T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown, token?: string): Promise<T> => {
  const result = await createMobileApi().request<T>(path, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return result.data;
};
