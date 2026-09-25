export const DEFAULT_API_ORIGIN = "https://ezygocouriers.co.za";

/** Development builds also work against production unless explicitly overridden. */
export function resolveApiOrigin(configuredUrl: string | undefined, development: boolean): string {
  const value = configuredUrl?.trim() || DEFAULT_API_ORIGIN;
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("The app's API address is invalid. Check EXPO_PUBLIC_API_URL and restart Expo."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The app's API address must be a server origin without a path or credentials.");
  }
  if (!development && url.protocol !== "https:") throw new Error("A secure connection is required.");
  return url.origin;
}
