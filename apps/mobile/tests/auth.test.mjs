import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionController } from '../lib/auth/session-controller.ts';
import { OAuthFlow } from '../lib/auth/oauth-flow.ts';
import { parseGoogleLink } from '../lib/auth/links.ts';
import { ApiError } from '@ezygo/api-client';
const user = { id: 1, full_name: 'Customer', email: 'customer@example.test', role: 'customer' };
const data = (token = 'signed-token') => ({ access_token: token, token_type: 'Bearer', expires_at: '2000-01-01T00:00:00Z', expires_in: 3600, user });
function setup(handler = async () => data()) {
  let saved = null, time = 0;
  const store = { async read() { return saved; }, async write(value) { saved = value; }, async clear() { saved = null; } };
  const calls = [];
  const controller = new SessionController(store, async (...args) => { calls.push(args); return handler(...args); }, () => time);
  return { controller, store, calls, saved: () => saved, time: value => { time = value; } };
}
const login = { email: user.email, password: 'Example1Password' };
test('empty secure store opens sign-in without a network request', async () => {
  const f = setup(); await f.controller.restore(); assert.equal(f.controller.getSnapshot().phase, 'signedOut'); assert.equal(f.calls.length, 0);
});
test('server TTL and monotonic time control renewal regardless of device date', async () => {
  const f = setup(); await f.controller.signIn(login);
  assert.equal(f.controller.getSnapshot().phase, 'authenticated');
  await f.controller.request('/api/deliveries'); assert.equal(f.calls.length, 2);
  f.time(3600000); await f.controller.request('/api/deliveries');
  assert.equal(f.calls[2][0], '/api/mobile/v1/auth/refresh');
  assert.equal(f.saved().expiresAt, '2000-01-01T00:00:00Z');
});
for (const status of [401,403]) test(`restore clears authoritative ${status} rejection`, async () => {
  const f = setup(async path => { if (path.endsWith('refresh')) throw new ApiError('Expired', status); return data(); });
  await f.controller.signIn(login); f.controller.lock(); await f.controller.restore();
  assert.equal(f.saved(), null); assert.equal(f.controller.getSnapshot().phase, 'signedOut');
});
for (const error of [new TypeError('Network failed'), new ApiError('Unavailable', 503)]) test(`interrupted restore retains secure token but gates access: ${error.message}`, async () => {
  const f = setup(async path => { if (path.endsWith('refresh')) throw error; return data(); });
  await f.controller.signIn(login); f.controller.lock(); await f.controller.restore();
  assert.equal(f.saved().accessToken, 'signed-token'); assert.equal(f.controller.getSnapshot().phase, 'offline');
  await assert.rejects(f.controller.request('/api/deliveries'));
});
test('offline logout clears local credentials and reports unconfirmed revocation', async () => {
  const f = setup(async path => { if (path.endsWith('logout')) throw new TypeError('Offline'); return data(); });
  await f.controller.signIn(login); await f.controller.signOut(); assert.equal(f.saved(), null);
  assert.match(f.controller.getSnapshot().message, /could not be confirmed/);
});
test('late refresh cannot restore a session after logout', async () => {
  let release, started;
  const ready = new Promise(resolve => { started = resolve; });
  const f = setup(async path => { if (path.endsWith('refresh')) { started(); return new Promise(resolve => { release = resolve; }); } return data(); });
  await f.controller.signIn(login); const pending = f.controller.restore(); await ready;
  await f.controller.signOut(); release(data()); await pending;
  assert.equal(f.saved(), null); assert.equal(f.controller.getSnapshot().phase, 'signedOut');
});
test('late login is revoked after logout', async () => {
  let release;
  const f = setup(async path => path.endsWith('login') ? new Promise(resolve => { release = resolve; }) : null);
  const pending = f.controller.signIn(login); await f.controller.signOut(); release(data()); await pending;
  assert.equal(f.saved(), null); assert.ok(f.calls.some(([path]) => path.endsWith('logout')));
});
test('secure write failure revokes issued credential and never opens private UI', async () => {
  const f = setup(); f.store.write = async () => { throw new Error('Locked'); };
  await assert.rejects(f.controller.signIn(login), /saved securely/);
  assert.equal(f.controller.getSnapshot().phase, 'storageError'); assert.equal(f.saved(), null);
  assert.ok(f.calls.some(([path]) => path.endsWith('logout')));
});
test('late unauthorized request cannot clear a replacement session', async () => {
  let reject;
  const f = setup(async (path, method, body) => path === '/api/deliveries' ? new Promise((_, no) => { reject = no; }) : data(body?.password || 'signed-token'));
  await f.controller.signIn(login); const pending = f.controller.request('/api/deliveries');
  await new Promise(resolve => setImmediate(resolve));
  await f.controller.signIn({ ...login, password: 'new-token' }); reject(new ApiError('Revoked', 401));
  await assert.rejects(pending); assert.equal(f.saved().accessToken, 'new-token');
});
const state = 'a'.repeat(64), verifier = 'b'.repeat(64), code = 'c'.repeat(43);
const callback = `ezygo://auth/callback?state=${state}&code=${code}`;
test('OAuth accepts only expected callback, state, and one-use-code fields', () => {
  assert.equal(parseGoogleLink(callback).code, code);
  for (const url of [callback.replace('ezygo:', 'https:'), callback + '&access_token=secret', callback + '&state=' + state, callback.replace('auth/callback','evil/callback')]) assert.throws(() => parseGoogleLink(url));
});
test('OAuth requires secure pending state, sends verifier and deduplicates callback delivery', async () => {
  let pending = null, exchanges = 0;
  const flow = new OAuthFlow({ async read() { return pending; }, async write(v) { pending = v; }, async clear() { pending = null; } }, async input => { assert.equal(input.code_verifier, verifier); exchanges++; });
  await assert.rejects(flow.complete(callback)); await flow.prepare({ state, verifier });
  await assert.rejects(flow.complete(callback.replace(state, 'd'.repeat(64))));
  await Promise.all([flow.complete(callback), flow.complete(callback)]); await flow.complete(callback);
  assert.equal(exchanges, 1); assert.equal(pending, null);
});
test('OAuth cancellation rejects a pending secure-store read before exchange', async () => {
  let release, exchanges = 0;
  const flow = new OAuthFlow({ read: () => new Promise(resolve => { release = resolve; }), async write() {}, async clear() {} }, async () => { exchanges++; });
  const pending = flow.complete(callback); await flow.cancel(); release({ state, verifier });
  await assert.rejects(pending); assert.equal(exchanges, 0);
});
