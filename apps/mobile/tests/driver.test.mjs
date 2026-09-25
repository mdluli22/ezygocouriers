import test from 'node:test';
import assert from 'node:assert/strict';
import { DriverOutbox } from '../lib/driver/outbox.ts';
import { contactUrl, mapsUrl } from '../lib/driver/links.ts';
import { ApiError } from '@ezygo/api-client';
import { driverStatusUpdateSchema, driverLocationSchema } from '@ezygo/contracts';
const id = '6cd6be57-c965-4f5a-8f72-0bd58672ddbd';
function fixture(send = async () => {}) {
  const rows = new Map(); let owner = 1, now = 1000000;
  const store = { async read(user) { return structuredClone(rows.get(user) ?? { statuses: [] }); }, async write(user, data) { rows.set(user, structuredClone(data)); } };
  const queue = new DriverOutbox(store, send, user => user === owner, () => now);
  return { queue, store, owner: value => { owner = value; }, time: value => { now = value; } };
}
const action = { operation_id: id, delivery_id: 2, status: 'delivered', pin: '123456', note: 'Handed over' };
test('offline status retries preserve operation IDs, honor backoff and clear only after acknowledgement', async () => {
  const calls = []; let online = false;
  const f = fixture(async (_owner, _kind, body) => { calls.push(body.operation_id); if (!online) throw new ApiError('Offline', 0); });
  await f.queue.enqueue(1, action); await f.queue.flush(1);
  assert.equal((await f.queue.read(1)).statuses.length, 1);
  await f.queue.flush(1); assert.equal(calls.length, 1);
  f.time(1010000); online = true; await f.queue.flush(1);
  assert.deepEqual(calls, [id, id]); assert.equal((await f.queue.read(1)).statuses.length, 0);
});
test('wrong PIN becomes visible blocked work and is never retried automatically', async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; throw new ApiError('Incorrect PIN', 400, 'PIN_INVALID'); });
  await f.queue.enqueue(1, action); await f.queue.flush(1); await f.queue.flush(1);
  const saved = (await f.queue.read(1)).statuses[0];
  assert.equal(saved.blocked, true); assert.equal(saved.body.pin, undefined); assert.equal(calls, 1);
});
test('account switches cannot send or add another driver’s pending work', async () => {
  let calls = 0; const f = fixture(async () => { calls++; });
  await f.queue.enqueue(1, action); f.owner(2); await f.queue.flush(1);
  await assert.rejects(f.queue.enqueue(1, action)); assert.equal(calls, 0);
  assert.equal((await f.queue.read(2)).statuses.length, 0);
});
test('only one unconfirmed change per trip is allowed and expiration removes sensitive PIN', async () => {
  const f = fixture(); await f.queue.enqueue(1, action);
  await assert.rejects(f.queue.enqueue(1, { ...action, operation_id: 'different' }));
  f.time(1000000 + 86400001); await f.queue.flush(1);
  const expired = (await f.queue.read(1)).statuses[0]; assert.equal(expired.blocked, true); assert.equal(expired.body.pin, undefined);
});
test('location queue coalesces newest samples and discards stale points', async () => {
  const calls = []; const f = fixture(async (_owner, kind, body) => { calls.push([kind, body.latitude]); });
  const point = time => ({ delivery_id: 2, latitude: time / 1000000, longitude: 18.4, recorded_at: new Date(time).toISOString() });
  await f.queue.location(1, point(990000)); await f.queue.location(1, point(995000)); await f.queue.location(1, point(991000));
  await f.queue.flush(1); assert.deepEqual(calls, [['location', .995]]);
  await f.queue.location(1, point(1000000)); f.time(1060001); await f.queue.flush(1);
  assert.equal(calls.length, 1); assert.equal((await f.queue.read(1)).location, undefined);
});
test('retry-after prevents repeated requests and signout clears stored work', async () => {
  let calls = 0; const f = fixture(async () => { calls++; throw new ApiError('Rate limited', 429, 'RATE_LIMITED', null, { retryAfter: 120 }); });
  await f.queue.enqueue(1, action); await f.queue.flush(1); f.time(1060000); await f.queue.flush(1); assert.equal(calls, 1);
  await f.queue.clear(1); assert.deepEqual(await f.queue.read(1), { statuses: [] });
});
test('contact and maps links encode input without arbitrary URL injection', () => {
  assert.equal(contactUrl('+27 (82) 123-4567'), 'tel:+27821234567');
  assert.throws(() => contactUrl('123;https://evil.test'));
  assert.match(mapsUrl('A&B Cape Town', 'ios'), /A%26B%20Cape%20Town/);
  assert.match(mapsUrl('Cape Town', 'android'), /^geo:/);
});
test('shared status and location schemas validate mobile mutation metadata', () => {
  assert.equal(driverStatusUpdateSchema.safeParse(action).success, true);
  assert.equal(driverStatusUpdateSchema.safeParse({ ...action, pin: '12345' }).success, false);
  assert.equal(driverStatusUpdateSchema.safeParse({ ...action, operation_id: 'untrusted' }).success, false);
  assert.equal(driverLocationSchema.safeParse({ latitude: -33.9, longitude: 18.4, delivery_id: 2, recorded_at: 'invalid' }).success, false);
});
