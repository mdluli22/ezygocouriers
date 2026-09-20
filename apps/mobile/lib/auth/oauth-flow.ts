import { parseGoogleLink } from "./links";

export interface PendingOAuth { state: string; verifier: string }
export interface OAuthStore {
  read(): Promise<PendingOAuth | null>;
  write(value: PendingOAuth): Promise<void>;
  clear(): Promise<void>;
}
export class OAuthFlow {
  private pendingCompletion: Promise<void> | null = null;
  private generation = 0;
  private completedState: string | null = null;
  constructor(private store: OAuthStore, private exchange: (input: { code: string; state: string; code_verifier: string }) => Promise<void>) {}
  async prepare(value: PendingOAuth) { this.generation++; this.completedState = null; await this.store.write(value); }
  async cancel() { this.generation++; await this.store.clear(); }
  complete(url: string): Promise<void> {
    if (this.pendingCompletion) return this.pendingCompletion;
    const operation = this.finish(url);
    this.pendingCompletion = operation;
    void operation.then(() => { this.pendingCompletion = null; }, () => { this.pendingCompletion = null; });
    return operation;
  }
  private async finish(url: string) {
    const generation = this.generation;
    const callback = parseGoogleLink(url);
    if (callback.state === this.completedState) return;
    const pending = await this.store.read();
    if (generation !== this.generation || !pending || pending.state !== callback.state) throw new Error("This sign-in link does not match your request. Start Google sign-in again.");
    if (callback.error || !callback.code) {
      await this.store.clear();
      throw new Error("Google sign-in was not completed. Please try again.");
    }
    // A code is one use; interruption is recovered by starting a new sign-in.
    await this.exchange({ code: callback.code, state: callback.state, code_verifier: pending.verifier });
    this.completedState = callback.state;
    await this.store.clear();
  }
}
