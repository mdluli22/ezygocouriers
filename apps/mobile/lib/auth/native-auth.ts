import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { getMobileApiOrigin, mobileTransport } from "../api";
import { sessionStore, secureStorage, oauthKey } from "./storage";
import { SessionController } from "./session-controller";
import { OAuthFlow, type PendingOAuth } from "./oauth-flow";
import { GOOGLE_RETURN_URL, validateGoogleStartUrl } from "./links";

export const authController = new SessionController(sessionStore, mobileTransport);
export const googleFlow = new OAuthFlow({
  async read() {
    const raw = await secureStorage.read(oauthKey);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as PendingOAuth;
      if (/^[a-f0-9]{64}$/.test(value.state) && /^[a-f0-9]{64}$/.test(value.verifier)) return value;
    } catch { /* Invalid pending state must never authorize a callback. */ }
    await secureStorage.clear(oauthKey);
    return null;
  },
  async write(value) { await secureStorage.write(oauthKey, JSON.stringify(value)); },
  async clear() { await secureStorage.clear(oauthKey); },
}, input => authController.exchangeGoogle(input));

async function randomValue() { return Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, "0")).join(""); }
export const googleSignInAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export async function startGoogleSignIn() {
  if (!googleSignInAvailable) throw new Error("Google sign-in requires an EzyGo development build. Use email sign-in in Expo Go.");
  const state = await randomValue();
  const verifier = await randomValue();
  const challenge = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await googleFlow.prepare({ state, verifier });
  const { authorization_url } = await authController.beginGoogle({ state, code_challenge: challenge });
  validateGoogleStartUrl(authorization_url, getMobileApiOrigin());
  const result = await WebBrowser.openAuthSessionAsync(authorization_url, GOOGLE_RETURN_URL, { preferEphemeralSession: true });
  if (result.type === "success") await googleFlow.complete(result.url);
  // A dismissed browser can race with the Router receiving the callback. Keep
  // the verifier securely until a new attempt replaces it or explicit logout.
}
