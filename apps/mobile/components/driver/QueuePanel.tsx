import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { STATUS_LABELS } from "@ezygo/contracts";
import { driverOutbox } from "../../lib/driver/queue";
import type { OutboxState } from "../../lib/driver/outbox";
import { Card, Action, Notice, errorMessage } from "../customer/UI";
export function QueuePanel({ owner, trip }: { owner: number; trip?: number }) {
  const [state, setState] = useState<OutboxState>({ statuses: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const read = useCallback(async () => { try { setState(await driverOutbox.read(owner)); } catch (e) { setError(errorMessage(e)); } }, [owner]);
  useFocusEffect(useCallback(() => { void read(); const timer = setInterval(() => void read(), 3000); return () => clearInterval(timer); }, [read]));
  async function sync() { setBusy(true); setError(""); try { await driverOutbox.flush(owner); await read(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  async function discard(id: string) { try { await driverOutbox.discard(owner, id); await read(); } catch (e) { setError(errorMessage(e)); } }
  const pending = state.statuses.filter(s => !trip || s.body.delivery_id === trip);
  if (!pending.length && !state.location && !error) return null;
  return <Card><Notice message="Saved on this device. A queued change is not confirmed until accepted by the server." />
    {pending.map(s => <Card key={s.id}><Notice message={`Trip ${s.body.delivery_id}: ${STATUS_LABELS[s.body.status]} · ${s.blocked ? "Needs attention" : "Waiting to sync"}`} /><Notice message={s.error} error={s.blocked} />{s.blocked ? <Action secondary label="Dismiss rejected change" onPress={() => void discard(s.id)} /> : null}</Card>)}
    {state.location ? <Notice message="Latest location waiting to sync; stale readings are discarded." /> : null}
    <Notice message={error} error /><Action label="Retry sync" busy={busy} onPress={() => void sync()} />
  </Card>;
}
