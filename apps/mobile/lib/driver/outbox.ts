import { ApiError } from "@ezygo/api-client";
import type { DriverStatusUpdateInput, DriverLocationInput } from "@ezygo/contracts";
export interface PendingStatus {
  id: string; body: DriverStatusUpdateInput; created: number;
  attempts: number; due: number; error?: string; blocked?: boolean;
}
export interface OutboxState { statuses: PendingStatus[]; location?: DriverLocationInput; locationDue?: number }
export interface OutboxStore { read(owner: number): Promise<OutboxState>; write(owner: number, state: OutboxState): Promise<void> }
const transient = (e: unknown) => e instanceof ApiError && (e.status === 0 || e.status === 408 || e.status === 429 || e.status >= 500);
export class DriverOutbox {
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private store: OutboxStore, private send: (owner: number, kind: "status" | "location", body: DriverStatusUpdateInput | DriverLocationInput) => Promise<unknown>, private authorized: (owner: number) => boolean, private now = Date.now) {}
  private run<T>(work: () => Promise<T>) { const result = this.serial.catch(() => undefined).then(work); this.serial = result; return result; }
  read(owner: number) { return this.run(() => this.store.read(owner)); }
  enqueue(owner: number, body: DriverStatusUpdateInput) {
    return this.run(async () => {
      if (!this.authorized(owner)) throw new Error("Verify your driver session first.");
      const state = await this.store.read(owner);
      if (!body.operation_id) throw new Error("An operation ID is required.");
      if (state.statuses.some(s => s.body.delivery_id === body.delivery_id)) throw new Error("Sync or dismiss this trip’s pending change before adding another.");
      if (state.statuses.length >= 8) throw new Error("The offline queue is full. Reconnect before adding more changes.");
      state.statuses.push({ id: body.operation_id, body, created: this.now(), attempts: 0, due: 0 });
      await this.store.write(owner, state);
    });
  }
  location(owner: number, point: DriverLocationInput) {
    return this.run(async () => {
      if (!this.authorized(owner)) return;
      const state = await this.store.read(owner);
      if (!point.recorded_at || this.now() - Date.parse(point.recorded_at) > 60000) return;
      if (!state.location || Date.parse(point.recorded_at) > Date.parse(state.location.recorded_at!)) state.location = point;
      await this.store.write(owner, state);
    });
  }
  clearLocation(owner: number) { return this.run(async () => { const state = await this.store.read(owner); delete state.location; delete state.locationDue; await this.store.write(owner, state); }); }
  discard(owner: number, id: string) { return this.run(async () => { const state = await this.store.read(owner); state.statuses = state.statuses.filter(s => s.id !== id); await this.store.write(owner, state); }); }
  clear(owner: number) { return this.run(() => this.store.write(owner, { statuses: [] })); }
  flush(owner: number) {
    return this.run(async () => {
      if (!this.authorized(owner)) return;
      const state = await this.store.read(owner);
      for (const item of [...state.statuses]) {
        if (!this.authorized(owner)) return;
        if (item.blocked || item.due > this.now()) continue;
        if (this.now() - item.created > 86400000) {
          item.blocked = true; item.error = "This change expired. Refresh the trip and enter it again."; delete item.body.pin;
          await this.store.write(owner, state); continue;
        }
        try {
          await this.send(owner, "status", item.body);
          state.statuses = state.statuses.filter(s => s.id !== item.id);
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) return;
          item.attempts++;
          item.error = transient(e) ? "Waiting to retry when connected." : e instanceof Error ? e.message.slice(0, 240) : "Unable to apply this change. Refresh the trip.";
          if (transient(e)) item.due = this.now() + Math.max(e instanceof ApiError ? (e.retryAfter ?? 0) * 1000 : 0, Math.min(300000, 2000 * 2 ** Math.min(item.attempts, 7)));
          else { item.blocked = true; delete item.body.pin; }
          await this.store.write(owner, state);
          if (transient(e)) return;
          continue;
        }
        await this.store.write(owner, state);
      }
      if (!this.authorized(owner) || !state.location) return;
      const age = this.now() - Date.parse(state.location.recorded_at ?? "");
      if (!Number.isFinite(age) || age > 60000 || age < -10000) delete state.location;
      else if ((state.locationDue ?? 0) <= this.now()) {
        try { await this.send(owner, "location", state.location); delete state.location; delete state.locationDue; }
        catch (e) {
          if (!transient(e)) delete state.location;
          else state.locationDue = this.now() + Math.max(e instanceof ApiError ? (e.retryAfter ?? 0) * 1000 : 0, 15000);
        }
      }
      await this.store.write(owner, state);
    });
  }
}
