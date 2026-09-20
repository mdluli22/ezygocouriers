import * as SecureStore from "expo-secure-store";
import type { SessionStore, StoredSession } from "./session-controller";

const options: SecureStore.SecureStoreOptions = {
  keychainService: "za.co.ezygocouriers.app.auth",
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
const key = "ezygo.session.v1";
export const oauthKey = "ezygo.oauth.pending.v1";
export const secureStorage = {
  async read(key: string) {
    if (!await SecureStore.isAvailableAsync()) throw new Error("Secure storage unavailable");
    return SecureStore.getItemAsync(key, options);
  },
  async write(key: string, value: string) {
    if (!await SecureStore.isAvailableAsync()) throw new Error("Secure storage unavailable");
    await SecureStore.setItemAsync(key, value, options);
  },
  async clear(key: string) { await SecureStore.deleteItemAsync(key, options); },
};
export const sessionStore: SessionStore = {
  async read() {
    const raw = await secureStorage.read(key);
    if (!raw) return null;
    let value: StoredSession;
    try { value = JSON.parse(raw); }
    catch { await secureStorage.clear(key); return null; }
    if (value?.version !== 1 || typeof value.accessToken !== "string" || !value.accessToken || value.accessToken.length > 4096 || typeof value.expiresAt !== "string") {
      await secureStorage.clear(key);
      return null;
    }
    return value;
  },
  async write(session) { await secureStorage.write(key, JSON.stringify(session)); },
  async clear() { await secureStorage.clear(key); },
};
