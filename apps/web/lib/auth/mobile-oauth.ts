import { createHash, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "./auth";
import { query, getClient } from "@/lib/db/server";
import { ApiProblem } from "@/lib/api/errors";
import { applyAuthCookies } from "./response";
import { mobileTokenData, resolveMobileSession } from "./mobile-session";

const browserCookie = "ezygo.mobile_oauth";
const callbackLink = "ezygo://auth/callback";
const random = () => randomBytes(32).toString("base64url");
const hash = (value: string) => createHash("sha256").update(value).digest("base64url");
function equal(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new ApiProblem("SERVICE_UNAVAILABLE", "Google sign-in is unavailable.", 503);
  return createHash("sha256").update(`ezygo-mobile-handoff:${secret}`).digest();
}
function seal(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}
function unseal(value: string) {
  const [iv, tag, encrypted] = value.split(".").map(part => Buffer.from(part, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString("utf8");
}
export function mobileAuthOrigin() {
  const value = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new ApiProblem("SERVICE_UNAVAILABLE", "Google sign-in is unavailable.", 503);
  const origin = new URL(value);
  if (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))
    throw new ApiProblem("SERVICE_UNAVAILABLE", "Google sign-in requires a secure origin.", 503);
  return origin.origin;
}
interface Flow { request_id: string; code_challenge: string; client_state: string; browser_hash: string | null; code_hash: string | null; encrypted_token: string | null }
const invalid = () => new ApiProblem("OAUTH_INVALID", "This sign-in attempt has expired or is invalid. Start again.");

export async function beginMobileGoogle(input: { state: string; code_challenge: string }) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    throw new ApiProblem("SERVICE_UNAVAILABLE", "Google sign-in is unavailable. Please use email.", 503);
  const origin = mobileAuthOrigin();
  const id = random();
  await query("INSERT INTO mobile_oauth_flows (request_id, code_challenge, client_state) VALUES ($1, $2, $3)", [id, input.code_challenge, input.state]);
  return { authorization_url: `${origin}/api/mobile/v1/auth/google/start?request=${id}` };
}

export async function startMobileGoogle(request: NextRequest, id: string) {
  const browser = random();
  const flow = await query<Flow>(
    `UPDATE mobile_oauth_flows SET browser_hash = $2
     WHERE request_id = $1 AND expires_at > NOW() AND browser_hash IS NULL RETURNING *`, [id, hash(browser)],
  );
  if (!flow.rows[0]) throw invalid();
  const origin = mobileAuthOrigin();
  const returnURL = `${origin}/api/mobile/v1/auth/google/callback?request=${id}`;
  const result = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: returnURL, errorCallbackURL: `${returnURL}&error=oauth_failed`, disableRedirect: true },
    headers: request.headers, returnHeaders: true,
  });
  if (!result.response.url) throw invalid();
  const response = applyAuthCookies(NextResponse.redirect(result.response.url), result.headers);
  response.cookies.set(browserCookie, browser, { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), path: "/api/mobile/v1/auth/google", maxAge: 600 });
  return response;
}

export async function finishMobileGoogle(request: NextRequest, id: string) {
  const browser = request.cookies.get(browserCookie)?.value;
  if (!browser) throw invalid();
  const found = await query<Flow>("SELECT * FROM mobile_oauth_flows WHERE request_id=$1 AND expires_at>NOW()", [id]);
  const flow = found.rows[0];
  if (!flow || !flow.browser_hash || !equal(flow.browser_hash, hash(browser)) || flow.code_hash) throw invalid();
  const link = new URL(callbackLink);
  link.searchParams.set("state", flow.client_state);
  const signedToken = getSessionCookie(request, { cookiePrefix: "ezygo" });
  const session = signedToken ? await resolveMobileSession(request.headers, { accessToken: signedToken, refresh: false }) : null;
  if (request.nextUrl.searchParams.has("error") || !session) {
    await query("DELETE FROM mobile_oauth_flows WHERE request_id=$1", [id]);
    link.searchParams.set("error", "oauth_failed");
  } else {
    const code = random();
    const issued = await query(
      `UPDATE mobile_oauth_flows SET code_hash=$2, encrypted_token=$3, expires_at=NOW()+INTERVAL '60 seconds'
       WHERE request_id=$1 AND code_hash IS NULL AND expires_at>NOW() RETURNING request_id`,
      [id, hash(code), seal(session.accessToken)],
    );
    if (!issued.rowCount) throw invalid();
    link.searchParams.set("code", code);
  }
  const response = NextResponse.redirect(link);
  response.cookies.set(browserCookie, "", { httpOnly: true, secure: mobileAuthOrigin().startsWith("https:"), sameSite: "lax", path: "/api/mobile/v1/auth/google", maxAge: 0 });
  // Remove the browser's credential without revoking the session being handed
  // to native. Token transport happens only in the authenticated code exchange.
  const context = await auth.$context;
  response.cookies.set(context.authCookies.sessionToken.name, "", { ...context.authCookies.sessionToken.attributes, sameSite: "lax", maxAge: 0 });
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function exchangeMobileGoogle(input: { code: string; code_verifier: string; state: string }, headers: Headers) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const found = await client.query<Flow>("SELECT * FROM mobile_oauth_flows WHERE code_hash=$1 AND expires_at>NOW() FOR UPDATE", [hash(input.code)]);
    const flow = found.rows[0];
    if (!flow?.encrypted_token || !equal(flow.code_challenge, hash(input.code_verifier)) || !equal(flow.client_state, input.state)) throw invalid();
    const token = unseal(flow.encrypted_token);
    // Reject account suspension, email unverification, expiry or revocation
    // between the browser callback and the native exchange.
    const session = await resolveMobileSession(headers, { accessToken: token, refresh: false });
    if (!session) throw invalid();
    await client.query("DELETE FROM mobile_oauth_flows WHERE request_id=$1", [flow.request_id]);
    await client.query("COMMIT");
    return mobileTokenData(session);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
