export const GOOGLE_RETURN_URL = "ezygo://auth/callback";
export const EMAIL_VERIFY_URL = "ezygo://auth/verify";
export type GoogleCallback = { code?: string; state: string; error?: string };
export function parseGoogleLink(link: string): GoogleCallback {
  const url = new URL(link);
  if (url.protocol !== "ezygo:" || url.username || url.password || url.port || url.hash ||
      `${url.hostname}${url.pathname}` !== "auth/callback") throw new Error("Invalid sign-in link.");
  if ([...url.searchParams.keys()].some(key => !["code", "state", "error"].includes(key))) throw new Error("Invalid sign-in link.");
  for (const key of ["code", "state", "error"]) if (url.searchParams.getAll(key).length > 1) throw new Error("Invalid sign-in link.");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? undefined;
  const error = url.searchParams.get("error") ?? undefined;
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(state) || (code && !/^[A-Za-z0-9_-]{43}$/.test(code)) || (!code && !error) || (code && error)) throw new Error("Invalid sign-in link.");
  return { state, code, error };
}

export function validateGoogleStartUrl(value: string, apiOrigin: string) {
  const url = new URL(value);
  if (url.origin !== apiOrigin || url.username || url.password || url.hash || url.pathname !== "/api/mobile/v1/auth/google/start") {
    throw new Error("Google sign-in returned an unexpected server address. Please try again.");
  }
  return url.toString();
}
