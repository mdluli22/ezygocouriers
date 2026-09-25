import { ApiError } from "@ezygo/api-client";
import { secureStorage } from "../auth/storage";
import { authController } from "../auth/native-auth";
import { DriverOutbox, type OutboxState, type OutboxStore, type PendingStatus } from "./outbox";
const prefix = (owner: number) => `ezygo.driver.${owner}`;
export const outboxStore: OutboxStore = {
  async read(owner) {
    const root = prefix(owner);
    const ids: string[] = JSON.parse(await secureStorage.read(`${root}.index`) ?? "[]");
    const statuses: PendingStatus[] = [];
    for (const id of ids) {
      const raw = await secureStorage.read(`${root}.${id}`);
      if (!raw) throw new Error("A queued change could not be loaded. Please retry.");
      const item: PendingStatus = JSON.parse(raw);
      item.body.note = await secureStorage.read(`${root}.${id}.note`) ?? undefined;
      statuses.push(item);
    }
    const location = await secureStorage.read(`${root}.location`);
    return { statuses, ...(location ? JSON.parse(location) : {}) };
  },
  async write(owner, state: OutboxState) {
    const root = prefix(owner);
    const previous: string[] = JSON.parse(await secureStorage.read(`${root}.index`) ?? "[]");
    for (const item of state.statuses) {
      const { note, ...body } = item.body;
      // Split notes from the envelope to stay within SecureStore's per-value limit.
      await secureStorage.write(`${root}.${item.id}.note`, note ?? "");
      await secureStorage.write(`${root}.${item.id}`, JSON.stringify({ ...item, body }));
    }
    await secureStorage.write(`${root}.index`, JSON.stringify(state.statuses.map(s => s.id)));
    if (state.location) await secureStorage.write(`${root}.location`, JSON.stringify({ location: state.location, locationDue: state.locationDue }));
    else await secureStorage.clear(`${root}.location`);
    for (const id of previous.filter(id => !state.statuses.some(s => s.id === id))) {
      await secureStorage.clear(`${root}.${id}`); await secureStorage.clear(`${root}.${id}.note`);
    }
  },
};
export function isDriver(owner: number) {
  const state = authController.getSnapshot();
  return state.phase === "authenticated" && state.user?.role === "driver" && state.user.id === owner;
}
export const driverOutbox = new DriverOutbox(outboxStore, async (owner, kind, body) => {
  if (!isDriver(owner)) throw new ApiError("Your driver session has changed.", 401);
  try { return await authController.request(`/api/driver/${kind}`, "PATCH", body); }
  catch (error) { if (!isDriver(owner)) throw new ApiError("Verify your driver session to sync.", 401); throw error; }
}, isDriver);
