import { AsyncLocalStorage } from 'node:async_hooks';
export const requestHeaders = new AsyncLocalStorage();
export async function headers() { return requestHeaders.getStore() ?? new Headers(); }
