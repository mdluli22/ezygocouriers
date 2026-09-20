import { AsyncLocalStorage } from "node:async_hooks";

export const apiContext = new AsyncLocalStorage<{
  requestId: string;
  route: string;
  method: string;
}>();

/** Only allow operational metadata. Never serialize arbitrary errors or bodies. */
export function logEvent(event: string, fields: {
  status?: number;
  duration_ms?: number;
  rows?: number | null;
  code?: string;
} = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...apiContext.getStore(),
    ...fields,
  }));
}

export function logServerError(event: string, _error?: unknown) {
  void _error;
  // Exception messages can include SQL, credentials, addresses or provider payloads.
  logEvent(event, { code: "INTERNAL_ERROR" });
}
