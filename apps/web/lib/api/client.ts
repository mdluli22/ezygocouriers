export class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response: Response;
  try { response = await fetch(url, { ...init, cache: "no-store", signal }); }
  catch (error) {
    if (init.signal?.aborted) throw error;
    throw new RequestError(timeout.aborted ? "The request timed out. Please try again." : "Connection failed. Check your connection and try again.", 0);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new RequestError(response.status === 401 ? "Your session has expired. Please sign in again." : body?.message || "The request failed. Please try again.", response.status);
  }
  if (!body) throw new RequestError("The server returned an unreadable response. Please try again.", response.status);
  return body as T;
}
