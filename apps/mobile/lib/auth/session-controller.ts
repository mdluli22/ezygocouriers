import { ApiError } from "@ezygo/api-client";
import type { MobileAuthTokenData, MobileAuthUser, SignupInput, LoginInput } from "@ezygo/contracts";

export interface StoredSession { version: 1; accessToken: string; expiresAt: string }
export interface SessionStore {
  read(): Promise<StoredSession | null>;
  write(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}
export type AuthPhase = "loading" | "signedOut" | "authenticated" | "offline" | "storageError";
export interface AuthState { phase: AuthPhase; user: MobileAuthUser | null; message: string | null }
export type Transport = <T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown, token?: string) => Promise<T>;
const prefix = "/api/mobile/v1/auth";

/** No credentials or user profile are persisted outside the injected secure store. */
export class SessionController {
  private state: AuthState = { phase: "loading", user: null, message: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  private storageQueue: Promise<unknown> = Promise.resolve();
  private restoration: Promise<void> | null = null;
  private expiresAtMonotonic = 0;

  constructor(private store: SessionStore, private transport: Transport, private now = () => performance.now()) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(phase: AuthPhase, user: MobileAuthUser | null = null, message: string | null = null) {
    this.state = { phase, user, message };
    this.listeners.forEach(listener => listener());
  }
  private storage<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.storageQueue.catch(() => undefined).then(operation);
    this.storageQueue = next;
    return next;
  }
  private storageFailed() {
    this.emit("storageError", null, "Secure storage is unavailable. Unlock your device and try again.");
  }
  private async revoke(token: string) {
    try { await this.transport(`${prefix}/logout`, "POST", undefined, token); return true; }
    catch (error) { return error instanceof ApiError && error.status === 401; }
  }
  private async accept(data: MobileAuthTokenData, generation: number, newlyIssued = true) {
    if (!data.access_token || data.token_type !== "Bearer" || !Number.isFinite(data.expires_in) || data.expires_in <= 0)
      throw new Error("The session response is invalid. Please sign in again.");
    let stored = false;
    try {
      await this.storage(async () => {
        if (generation !== this.generation) return;
        await this.store.write({ version: 1, accessToken: data.access_token, expiresAt: data.expires_at });
        stored = true;
      });
    } catch {
      if (newlyIssued) await this.revoke(data.access_token);
      if (generation === this.generation) this.storageFailed();
      throw new Error("Your session could not be saved securely. Please try again.");
    }
    if (generation !== this.generation) {
      // A late login/refresh must not resurrect a signed-out session.
      if (!stored && newlyIssued) await this.revoke(data.access_token);
      return;
    }
    // Server duration + monotonic clock: changing device date cannot extend access.
    this.expiresAtMonotonic = this.now() + Math.max(0, data.expires_in - 30) * 1000;
    this.emit("authenticated", data.user);
  }
  async signIn(input: LoginInput) {
    const generation = ++this.generation;
    const data = await this.transport<MobileAuthTokenData>(`${prefix}/login`, "POST", input);
    await this.accept(data, generation);
  }
  async register(input: SignupInput) {
    await this.transport(`${prefix}/signup`, "POST", input);
  }
  async verify(email: string, otp: string) {
    const generation = ++this.generation;
    const data = await this.transport<MobileAuthTokenData>(`${prefix}/verify-email`, "POST", { email, otp });
    await this.accept(data, generation);
  }
  async resend(email: string) { await this.transport(`${prefix}/send-verification`, "POST", { email }); }
  async exchangeGoogle(input: { code: string; state: string; code_verifier: string }) {
    const generation = ++this.generation;
    const data = await this.transport<MobileAuthTokenData>(`${prefix}/google/exchange`, "POST", input);
    await this.accept(data, generation);
  }
  async beginGoogle(input: { state: string; code_challenge: string }) {
    return this.transport<{ authorization_url: string }>(`${prefix}/google`, "POST", input);
  }
  lock() {
    this.generation++;
    this.restoration = null;
    this.emit("loading");
  }
  restore = (): Promise<void> => {
    if (this.restoration) return this.restoration;
    const run = this.restoreSession();
    this.restoration = run;
    void run.finally(() => { if (this.restoration === run) this.restoration = null; });
    return run;
  };
  private async restoreSession() {
    const generation = this.generation;
    let saved: StoredSession | null;
    try { saved = await this.storage(() => this.store.read()); }
    catch { if (generation === this.generation) this.storageFailed(); return; }
    if (generation !== this.generation) return;
    if (!saved) { this.emit("signedOut"); return; }
    try {
      // Revalidate on launch/foreground; refresh returns a server-calculated TTL.
      // Never trust a device wall clock or a cached profile to authorize access.
      const data = await this.transport<MobileAuthTokenData>(`${prefix}/refresh`, "POST", undefined, saved.accessToken);
      await this.accept(data, generation, false);
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await this.invalidate(saved.accessToken);
      } else if (this.state.phase !== "storageError") {
        this.emit("offline", null, "We couldn’t verify your session. Check your connection and try again.");
      }
    }
  }
  private async invalidate(token: string) {
    try {
      await this.storage(async () => {
        const saved = await this.store.read();
        // Ignore a late 401 from a superseded session.
        if (saved?.accessToken !== token) return;
        this.generation++;
        await this.store.clear();
        this.emit("signedOut", null, "Your session has ended. Please sign in again.");
      });
    } catch { this.storageFailed(); }
  }
  async request<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown): Promise<T> {
    if (this.state.phase !== "authenticated") throw new Error("Please verify your session first.");
    if (this.now() >= this.expiresAtMonotonic) await this.restore();
    if (this.state.phase !== "authenticated") throw new Error("Please sign in again.");
    const generation = this.generation;
    let saved;
    try { saved = await this.storage(() => this.store.read()); }
    catch { this.storageFailed(); throw new Error("Secure storage is unavailable."); }
    if (generation !== this.generation) throw new Error("Your session has changed. Please try again.");
    if (!saved) { this.emit("signedOut"); throw new Error("Please sign in again."); }
    try { return await this.transport<T>(path, method, body, saved.accessToken); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) await this.invalidate(saved.accessToken);
      throw error;
    }
  }
  async signOut() {
    this.generation++;
    this.emit("loading");
    let saved: StoredSession | null = null;
    try {
      await this.storage(async () => { saved = await this.store.read(); await this.store.clear(); });
    } catch {
      if (saved) await this.revoke((saved as StoredSession).accessToken);
      this.storageFailed();
      return;
    }
    this.emit("signedOut");
    if (saved && !await this.revoke((saved as StoredSession).accessToken) && this.state.phase === "signedOut")
      this.emit("signedOut", null, "Signed out on this device. Server sign-out could not be confirmed while offline.");
  }
}
