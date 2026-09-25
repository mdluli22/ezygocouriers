import type { ApiErrorCode, ApiResponse, ApiSuccess } from "@ezygo/contracts";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorCode;
  readonly errors: Record<string, string> | null;
  readonly requestId?: string;
  readonly retryAfter?: number;

  constructor(message: string, status: number, code?: ApiErrorCode, errors: Record<string, string> | null = null, metadata: { requestId?: string; retryAfter?: number } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.requestId = metadata.requestId;
    this.retryAfter = metadata.retryAfter;
  }
}

export interface ApiClientOptions {
  /** Empty for same-origin browser requests; an HTTP(S) origin for native apps. */
  baseUrl?: string;
  credentials?: RequestCredentials;
  timeoutMs?: number;
  getAccessToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
  fetch?: typeof globalThis.fetch;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? "").replace(/\/+$/, "");
  if (baseUrl) {
    const url = new URL(baseUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("API baseUrl must be an HTTP(S) origin without credentials or a path.");
    }
  }

  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<ApiSuccess<T>> {
      // Prevent callers from redirecting an attached token to another host.
      if (!path.startsWith("/api/") || path.includes("\\")) {
        throw new Error("API requests must use a /api/ path.");
      }
      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      if (init.body != null && typeof init.body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      const token = await options.getAccessToken?.();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const controller = new AbortController();
      const abort = () => controller.abort();
      init.signal?.addEventListener("abort", abort, { once: true });
      if (init.signal?.aborted) abort();
      const timeout = setTimeout(abort, options.timeoutMs ?? 15000);
      try {
      const response = await (options.fetch ?? globalThis.fetch)(`${baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
        credentials: options.credentials ?? "same-origin",
        redirect: "error",
      });
      if (response.status === 401) await options.onUnauthorized?.();
      const retryHeader = response.headers.get("Retry-After");
      const metadata = {
        requestId: response.headers.get("X-Request-ID") ?? undefined,
        retryAfter: retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : undefined,
      };
      let payload: ApiResponse<T>;
      try {
        payload = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
        const message = response.status === 404
          ? "This feature is unavailable on the connected server. The server may need an update."
          : response.status >= 500
            ? "The server is temporarily unavailable. Please try again shortly."
            : "The server returned an unexpected response. Please try again.";
        throw new ApiError(message, response.status, response.status === 404 || response.status >= 500 ? "SERVICE_UNAVAILABLE" : undefined, null, metadata);
      }
      if (!payload || typeof payload !== "object" || typeof payload.success !== "boolean") {
        throw new ApiError("The server returned an invalid API response.", response.status, undefined, null, metadata);
      }
      if (!payload.success) {
        throw new ApiError(payload.message, response.status, payload.code, payload.errors, {
          ...metadata, requestId: metadata.requestId ?? payload.request_id,
        });
      }
      if (!response.ok) throw new ApiError("The API request failed.", response.status, undefined, null, metadata);
      return payload;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(controller.signal.aborted ? "The request timed out or was cancelled. Please try again." : "Unable to connect. Check your connection and try again.", 0);
      } finally {
        clearTimeout(timeout);
        init.signal?.removeEventListener("abort", abort);
      }
    },
  };
}
