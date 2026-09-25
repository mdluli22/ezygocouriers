import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { requestHeaders } from './fixtures/headers.mjs';

// Fail closed: no default connection to developer/application databases.
const dbUrl = process.env.API_TEST_DATABASE_URL;
if (!dbUrl) throw new Error('Set API_TEST_DATABASE_URL to a disposable PostgreSQL database named *_test.');
const db = new URL(dbUrl);
if (!db.pathname.endsWith('_test')) throw new Error('API test database name must end with _test.');
Object.assign(process.env, {
  DB_HOST: db.hostname, DB_PORT: db.port || '5432', DB_USER: decodeURIComponent(db.username),
  DB_PASSWORD: decodeURIComponent(db.password), DB_NAME: db.pathname.slice(1), DB_SSL: 'false',
  BETTER_AUTH_SECRET: 'api-tests-only-long-secret-not-production-12345',
  BETTER_AUTH_URL: 'http://localhost:3000', NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'test-google-client.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'test-google-secret',
  PAYSTACK_SECRET_KEY: 'sk_test_api_fixture', PAYSTACK_APP_URL: 'http://localhost:3000',
  API_TRUSTED_IP_HEADER: 'x-test-client-ip', API_RATE_LIMIT_SECRET: 'test-only-rate-limit-secret',
});
// Unique schema leaves even other test runs intact. No real user data is touched.
const schema = 'api_test_' + randomUUID().replaceAll('-', '');
process.env.PGOPTIONS = `-c search_path=${schema},public`;
const { default: pool } = await import('../lib/db/server.ts');
const { hashPassword } = await import('../lib/auth/password.ts');
const { hashDeliveryPin } = await import('../lib/delivery-pin.ts');
const { consumeLimit, clientIdentity } = await import('../lib/api/rate-limit.ts');
const { withApiRoute } = await import('../lib/api/route.ts');
const routes = {
  installations: await import("../app/api/mobile/v1/installations/route.ts"),
  live: await import("../app/api/deliveries/[id]/location/route.ts"),
  duty: await import("../app/api/driver/duty/route.ts"),
  login: await import('../app/api/mobile/v1/auth/login/route.ts'),
  customer: await import('../app/api/deliveries/[id]/route.ts'),
  driver: await import('../app/api/driver/deliveries/[id]/route.ts'),
  status: await import('../app/api/driver/status/route.ts'),
  location: await import('../app/api/driver/location/route.ts'),
  verifyPayment: await import("../app/api/payments/verify/route.ts"),
  places: await import("../app/api/places/route.ts"),
  booking: await import("../app/api/deliveries/route.ts"),
  payment: await import('../app/api/payments/create/route.ts'),
  webhook: await import('../app/api/payments/paystack/webhook/route.ts'),
  callback: await import('../app/api/payments/paystack/callback/route.ts'),
  assignment: await import('../app/api/admin/deliveries/route.ts'),
};
const tokens = {};
const ids = {};
async function call(module, method, pathname, role, body, id) {
  const headers = { host: 'localhost:3000', 'content-type': 'application/json', 'x-test-client-ip': '192.0.2.1' };
  if (role) headers.authorization = `Bearer ${tokens[role]}`;
  const req = new NextRequest(`http://localhost:3000${pathname}`, { method, headers, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  return requestHeaders.run(req.headers, () => module[method](req, { params: Promise.resolve({ id: String(id ?? 1) }) }));
}
async function delivery(status = 'assigned', pin = false) {
  const q = (await pool.query("INSERT INTO quotes (amount, currency, status) VALUES (99, 'ZAR', 'accepted') RETURNING id")).rows[0].id;
  const a = (await pool.query("INSERT INTO addresses (street_address, formatted_address, city, latitude, longitude) VALUES ('Test street', 'Test street Cape Town', 'Cape Town', -33.9, 18.4) RETURNING id")).rows[0].id;
  return (await pool.query(`INSERT INTO deliveries (customer_id, assigned_driver_id, pickup_address_id, dropoff_address_id, quote_id,
    pickup_contact_name, pickup_contact_phone, recipient_name, recipient_phone, recipient_email, parcel_description, status, require_pin, delivery_pin_hash, delivery_pin_sent_at)
    VALUES ($1, $2, $3, $3, $4, 'Pickup', '+27821234567', 'Recipient', '+27821234567', 'recipient@example.test', 'Test parcel', $5, $6, $7, NOW()) RETURNING id`,
    [ids.customer, ['assigned','picked_up','in_transit'].includes(status) ? ids.driverProfile : null, a, q, status, pin, pin ? await hashDeliveryPin('123456') : null])).rows[0].id;
}
async function pendingPayment() {
  const id = await delivery('confirmed');
  const reference = `test-${randomUUID()}`;
  const payment = (await pool.query(`INSERT INTO payments (delivery_id, customer_id, amount, currency, provider, status, provider_checkout_id)
    VALUES ($1, $2, 99, 'ZAR', 'paystack', 'pending', $3) RETURNING id`, [id, ids.customer, reference])).rows[0].id;
  return { id, payment, transaction: { id: payment + 10000, status: 'success', domain: 'test', reference, amount: 9900, currency: 'ZAR' } };
}
async function webhook(transaction, valid = true) {
  const body = JSON.stringify({ event: 'charge.success', data: transaction });
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
  const req = new NextRequest('http://localhost:3000/api/payments/paystack/webhook', { method: 'POST', body, headers: { 'x-paystack-signature': valid ? signature : 'invalid' } });
  return routes.webhook.POST(req);
}

before(async () => {
  await pool.query(`CREATE SCHEMA ${schema}`);
  const dir = new URL('../../../scripts/sql/', import.meta.url);
  for (const name of (await readdir(dir)).filter(n => /^\d+.*\.sql$/.test(n)).sort()) await pool.query(await readFile(new URL(name, dir), 'utf8'));
  const password = await hashPassword('Example1Password');
  for (const role of ['customer', 'otherCustomer', 'driver', 'otherDriver', 'admin']) {
    const userRole = role.includes('Customer') ? 'customer' : role.includes('Driver') ? 'driver' : role;
    ids[role] = (await pool.query('INSERT INTO users (full_name,email,role,email_verified) VALUES ($1,$2,$3,TRUE) RETURNING id', [role, `${role.toLowerCase()}@example.test`, userRole])).rows[0].id;
    await pool.query("INSERT INTO auth_accounts (id,account_id,provider_id,user_id,password) VALUES ($1,$2,'credential',$3,$4)", [randomUUID(), String(ids[role]), ids[role], password]);
    if (userRole === 'driver') ids[`${role}Profile`] = (await pool.query('INSERT INTO drivers (user_id) VALUES ($1) RETURNING id', [ids[role]])).rows[0].id;
    const response = await call(routes.login, 'POST', '/api/mobile/v1/auth/login', null, { email: `${role.toLowerCase()}@example.test`, password: 'Example1Password' });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    tokens[role] = data.data.access_token;
  }
});
beforeEach(async () => {
  await pool.query('TRUNCATE api_rate_limits, delivery_status_logs, payments, deliveries, quotes, addresses RESTART IDENTITY CASCADE');
  for (const role of ['driver','otherDriver']) ids[`${role}Profile`] = (await pool.query('INSERT INTO drivers (user_id) VALUES ($1) RETURNING id',[ids[role]])).rows[0].id;
  await pool.query("UPDATE drivers SET status = 'active',on_duty=TRUE,current_latitude=NULL,current_longitude=NULL,location_updated_at=NULL,location_stopped_at=NULL,location_session_id=NULL,location_delivery_id=NULL");
});
after(async () => { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); });

test('customer ownership, role isolation, safe detail fields and request tracing', async () => {
  const id = await delivery('assigned', true);
  const ok = await call(routes.customer, 'GET', `/api/deliveries/${id}`, 'customer', undefined, id);
  const body = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('x-ezygo-api-version'), '1');
  assert.equal(body.request_id, ok.headers.get('x-request-id'));
  assert.ok(!('delivery_pin_hash' in body.data.delivery));
  assert.equal((await call(routes.customer, 'GET', `/api/deliveries/${id}`, 'otherCustomer', undefined, id)).status, 404);
  assert.equal((await call(routes.customer, 'GET', `/api/deliveries/${id}`, 'driver', undefined, id)).status, 403);
  assert.equal((await call(routes.customer, 'POST', `/api/deliveries/${id}`, 'otherCustomer', { action: 'cancel' }, id)).status, 404);
  assert.equal((await call(routes.customer, 'GET', `/api/deliveries/${id}`, null, undefined, id)).status, 401);
});

test('only the assigned active driver can read or mutate a trip', async () => {
  const id = await delivery();
  const allowed = await call(routes.driver, 'GET', `/api/driver/deliveries/${id}`, 'driver', undefined, id);
  assert.equal(allowed.status, 200);
  assert.ok(!('delivery_pin_hash' in (await allowed.json()).data.delivery));
  assert.equal((await call(routes.driver, 'GET', `/api/driver/deliveries/${id}`, 'otherDriver', undefined, id)).status, 404);
  assert.equal((await call(routes.status, 'PATCH', '/api/driver/status', 'otherDriver', { delivery_id: id, status: 'picked_up' })).status, 404);
  assert.equal((await call(routes.status, 'PATCH', '/api/driver/status', 'customer', { delivery_id: id, status: 'picked_up' })).status, 403);
  await pool.query("UPDATE drivers SET status='suspended' WHERE id=$1", [ids.driverProfile]);
  assert.equal((await call(routes.status, 'PATCH', '/api/driver/status', 'driver', { delivery_id: id, status: 'picked_up' })).status, 403);
});

test('server enforces transitions and six-digit handover PIN, with one completion log', async () => {
  const id = await delivery('assigned', true);
  const update = (status, pin) => call(routes.status, 'PATCH', '/api/driver/status', 'driver', { delivery_id: id, status, ...(pin ? { pin } : {}) });
  assert.equal((await (await update('delivered', '123456')).json()).code, 'INVALID_TRANSITION');
  assert.equal((await update('picked_up')).status, 200);
  assert.equal((await update('in_transit')).status, 200);
  assert.equal((await (await update('delivered')).json()).code, 'PIN_REQUIRED');
  assert.equal((await (await update('delivered', '654321')).json()).code, 'PIN_INVALID');
  assert.equal((await update('delivered', '123456')).status, 200);
  assert.equal((await (await update('delivered', '123456')).json()).code, 'INVALID_TRANSITION');
  assert.equal((await pool.query("SELECT * FROM delivery_status_logs WHERE delivery_id=$1 AND status='delivered'", [id])).rowCount, 1);
  assert.ok((await pool.query('SELECT pin_verified_at FROM deliveries WHERE id=$1', [id])).rows[0].pin_verified_at);
});

test('cancellation stops at pickup and invalid JSON/fields have stable codes', async () => {
  const id = await delivery('picked_up');
  const response = await call(routes.customer, 'POST', `/api/deliveries/${id}`, 'customer', { action: 'cancel' }, id);
  assert.equal((await response.json()).code, 'INVALID_TRANSITION');
  assert.equal((await (await call(routes.status, 'PATCH', '/api/driver/status', 'driver', '{')).json()).code, 'INVALID_JSON');
  assert.equal((await (await call(routes.location, 'PATCH', '/api/driver/location', 'driver', { latitude: 300, longitude: 18 })).json()).code, 'VALIDATION_ERROR');
});

test('admin assignment rejects unpaid, terminal and unavailable drivers', async () => {
  const assign = (id, driver = ids.otherDriverProfile, role = 'admin') => call(routes.assignment, 'PATCH', '/api/admin/deliveries', role, { delivery_id: id, driver_id: driver });
  assert.equal((await assign(await delivery('confirmed'))).status, 400);
  assert.equal((await assign(await delivery('delivered'))).status, 400);
  const id = await delivery('paid');
  assert.equal((await assign(id, ids.otherDriverProfile, 'customer')).status, 403);
  assert.equal((await assign(id)).status, 200);
  assert.equal((await assign(await delivery('paid'))).status, 409);
});

test('checkout cannot be requested by another customer or driver', async () => {
  const id = await delivery('confirmed');
  const body = { delivery_id: id, payment_method: 'paystack' };
  assert.equal((await call(routes.payment, 'POST', '/api/payments/create', 'otherCustomer', body)).status, 404);
  assert.equal((await call(routes.payment, 'POST', '/api/payments/create', 'driver', body)).status, 403);
});

test('signed duplicate and concurrent webhooks are idempotent; conflicting transaction rejected', async () => {
  const { id, transaction } = await pendingPayment();
  const results = await Promise.all(Array.from({ length: 4 }, () => webhook(transaction)));
  for (const response of results) assert.equal(response.status, 200);
  assert.equal((await pool.query("SELECT * FROM delivery_status_logs WHERE delivery_id=$1 AND status='paid'", [id])).rowCount, 1);
  assert.equal((await pool.query("SELECT * FROM delivery_status_logs WHERE delivery_id=$1 AND status='assigned'", [id])).rowCount, 1);
  assert.equal((await pool.query("SELECT * FROM payments WHERE delivery_id=$1 AND status='complete'", [id])).rowCount, 1);
  assert.equal((await webhook({ ...transaction, id: transaction.id + 1 })).status, 500);
});

test('payment callback and webhook race completes once', async () => {
  const { id, transaction } = await pendingPayment();
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.ok(String(url).startsWith('https://api.paystack.co/transaction/verify/'));
    return Response.json({ status: true, data: transaction });
  };
  try {
    const [callback, notification] = await Promise.all([
      call(routes.callback, 'GET', `/api/payments/paystack/callback?reference=${transaction.reference}`), webhook(transaction),
    ]);
    assert.equal(callback.status, 307);
    assert.ok(callback.headers.get('location').includes('payment=success'));
    assert.equal(notification.status, 200);
    assert.equal((await pool.query("SELECT * FROM delivery_status_logs WHERE delivery_id=$1 AND status='paid'", [id])).rowCount, 1);
  } finally { globalThis.fetch = original; }
});

test('invalid signature, amount, currency and payment mode cannot fulfill a delivery', async () => {
  const { id, transaction } = await pendingPayment();
  assert.equal((await webhook(transaction, false)).status, 401);
  for (const fields of [{ amount: 1 }, { currency: 'USD' }, { domain: 'live' }, { status: 'failed' }])
    assert.equal((await webhook({ ...transaction, ...fields })).status, 400);
  assert.equal((await pool.query('SELECT status FROM deliveries WHERE id=$1', [id])).rows[0].status, 'confirmed');
});

test('atomic shared rate limits, expiry, trusted ingress identity and route 429', async () => {
  const policy = { name: 'test', max: 5, seconds: 60 };
  const results = await Promise.all(Array.from({ length: 20 }, () => consumeLimit(policy, 'one-user')));
  assert.equal(results.filter(r => r.allowed).length, 5);
  await pool.query("UPDATE api_rate_limits SET expires_at=NOW()-INTERVAL '1 second'");
  assert.equal((await consumeLimit(policy, 'one-user')).allowed, true);
  assert.equal(clientIdentity(new Headers({ 'x-forwarded-for': '192.0.2.33' })), 'unidentified');
  for (let i = 0; i < 10; i++) await consumeLimit({ name: 'login', max: 10, seconds: 300 }, 'email:customer@example.test');
  const limited = await call(routes.login, 'POST', '/api/mobile/v1/auth/login', null, { email: 'customer@example.test', password: 'wrong' });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, 'RATE_LIMITED');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});

test('oversized streamed body is rejected and thrown errors never leak secrets', async () => {
  const big = await call(routes.status, 'PATCH', '/api/driver/status', 'driver', JSON.stringify({ note: 'x'.repeat(33000) }));
  assert.equal(big.status, 413);
  assert.equal((await big.json()).code, 'PAYLOAD_TOO_LARGE');
  const handler = withApiRoute('/api/test', async () => { throw new Error('secret=password'); });
  const response = await handler(new NextRequest('http://localhost:3000/api/test'));
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes('secret'));
});

test('simultaneous checkout requests reuse one provider checkout and payment row', async () => {
  const id = await delivery('confirmed');
  const original = globalThis.fetch;
  let initializations = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.paystack.co/transaction/initialize');
    initializations++;
    const body = JSON.parse(init.body);
    return Response.json({ status: true, data: { authorization_url: 'https://checkout.paystack.com/test', access_code: 'test', reference: body.reference } });
  };
  try {
    const responses = await Promise.all(Array.from({ length: 3 }, () => call(routes.payment, 'POST', '/api/payments/create', 'customer', { delivery_id: id, payment_method: 'paystack' })));
    const values = [];
    for (const response of responses) { assert.equal(response.status, 200); values.push((await response.json()).data); }
    assert.equal(initializations, 1);
    assert.equal(new Set(values.map(v => v.checkout_id)).size, 1);
    assert.equal((await pool.query('SELECT * FROM payments WHERE delivery_id=$1', [id])).rowCount, 1);
  } finally { globalThis.fetch = original; }
});

test('PIN attempt protection persists across requests and responds with retry guidance', async () => {
  const id = await delivery('in_transit', true);
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await call(routes.status, 'PATCH', '/api/driver/status', 'driver', { delivery_id: id, status: 'delivered', pin: '654321' });
    assert.equal((await response.json()).code, 'PIN_INVALID');
  }
  const blocked = await call(routes.status, 'PATCH', '/api/driver/status', 'driver', { delivery_id: id, status: 'delivered', pin: '123456' });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal((await pool.query('SELECT status FROM deliveries WHERE id=$1', [id])).rows[0].status, 'in_transit');
});

test('mobile OTP registration, verification and session revocation use real auth', async () => {
  const signup = await import('../app/api/mobile/v1/auth/signup/route.ts');
  const verify = await import('../app/api/mobile/v1/auth/verify-email/route.ts');
  const session = await import('../app/api/mobile/v1/auth/session/route.ts');
  const logout = await import('../app/api/mobile/v1/auth/logout/route.ts');
  const { sent } = await import('./fixtures/smtp.mjs');
  const email = `new-${randomUUID()}@example.test`;
  assert.equal((await call(signup, 'POST', '/api/mobile/v1/auth/signup', null, { full_name: 'New Customer', email, password: 'Example1Password', confirm_password: 'Example1Password' })).status, 201);
  const unverified = await call(routes.login, 'POST', '/api/mobile/v1/auth/login', null, { email, password: 'Example1Password' });
  assert.equal((await unverified.json()).code, 'EMAIL_NOT_VERIFIED');
  const otp = sent.findLast(m => m.to === email && m.kind === 'otp').otp;
  const bad = await call(verify, 'POST', '/api/mobile/v1/auth/verify-email', null, { email, otp: otp === '000000' ? '999999' : '000000' });
  assert.equal((await bad.json()).code, 'OTP_INVALID');
  const verified = await call(verify, 'POST', '/api/mobile/v1/auth/verify-email', null, { email, otp });
  assert.equal(verified.status, 200);
  tokens.newCustomer = (await verified.json()).data.access_token;
  assert.equal((await call(session, 'GET', '/api/mobile/v1/auth/session', 'newCustomer')).status, 200);
  assert.equal((await call(logout, 'POST', '/api/mobile/v1/auth/logout', 'newCustomer')).status, 200);
  assert.equal((await call(session, 'GET', '/api/mobile/v1/auth/session', 'newCustomer')).status, 401);
});

test('OTP limits cannot be bypassed using a different route alias or IP', async () => {
  const otp = await import('../app/api/mobile/v1/auth/send-verification/route.ts');
  for (let i = 0; i < 5; i++) await consumeLimit({ name: 'otp-send', max: 5, seconds: 600 }, 'email:customer@example.test');
  const denied = await call(otp, 'POST', '/api/mobile/v1/auth/send-verification', null, { email: 'CUSTOMER@example.test' });
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get('vary'), 'Authorization');
  const browserAuth = await import('../app/api/auth/[...all]/route.ts');
  const request = new NextRequest('http://localhost:3000/api/auth/email-otp/send-verification-otp', { method: 'POST', headers: { host: 'localhost:3000', 'content-type': 'application/json', 'x-test-client-ip': '192.0.2.200' }, body: JSON.stringify({ email: 'customer@example.test', type: 'email-verification' }) });
  assert.equal((await browserAuth.POST(request)).status, 429);
});

test('rate-limit storage failure fails closed before performing a location write', async () => {
  await pool.query('ALTER TABLE api_rate_limits RENAME TO api_rate_limits_unavailable');
  try {
    const response = await call(routes.location, 'PATCH', '/api/driver/location', 'driver', { latitude: -33.9, longitude: 18.4 });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'SERVICE_UNAVAILABLE');
  } finally { await pool.query('ALTER TABLE api_rate_limits_unavailable RENAME TO api_rate_limits'); }
});

test('request IDs are generated independently and structured logs exclude secrets', async () => {
  const logs = [];
  const original = console.log;
  console.log = line => logs.push(line);
  try {
    const handler = withApiRoute('/api/test', async () => { throw new Error('secret=password123'); });
    const responses = await Promise.all(Array.from({ length: 2 }, () => handler(new NextRequest('http://localhost:3000/api/test?token=secret', { headers: { 'x-request-id': 'attacker-controlled', authorization: 'Bearer hidden-secret' } }))));
    const ids = responses.map(r => r.headers.get('x-request-id'));
    assert.notEqual(ids[0], ids[1]);
    assert.ok(!ids.includes('attacker-controlled'));
    const parsed = logs.map(line => JSON.parse(line));
    assert.equal(parsed.filter(row => row.event === 'api.request').length, 2);
    for (const row of parsed) assert.ok(ids.includes(row.requestId));
    assert.ok(!logs.join('').includes('secret'));
  } finally { console.log = original; }
});


test('request wrapper preserves immutable provider redirects and cookie headers', async () => {
  const redirect = withApiRoute('/api/test', async () => Response.redirect('https://example.test/return'));
  const response = await redirect(new NextRequest('http://localhost:3000/api/test'));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.test/return');
  assert.ok(response.headers.get('x-request-id'));
  const cookies = withApiRoute('/api/test', async () => {
    const headers = new Headers();
    headers.append('set-cookie', 'first=1; HttpOnly');
    headers.append('set-cookie', 'second=2; HttpOnly');
    return new Response(null, { headers });
  });
  assert.equal((await cookies(new NextRequest('http://localhost:3000/api/test'))).headers.getSetCookie().length, 2);
});

test('concurrent confirmations record one transition and cannot revive a cancelled delivery', async () => {
  const id = await delivery('quoted');
  const confirm = () => call(routes.customer, 'POST', `/api/deliveries/${id}`, 'customer', { action: 'confirm' }, id);
  const responses = await Promise.all([confirm(), confirm()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
  assert.equal((await pool.query("SELECT * FROM delivery_status_logs WHERE delivery_id=$1 AND status='confirmed'", [id])).rowCount, 1);
  assert.equal((await call(routes.customer, 'POST', `/api/deliveries/${id}`, 'customer', { action: 'cancel' }, id)).status, 200);
  assert.equal((await (await confirm()).json()).code, 'INVALID_TRANSITION');
  assert.equal((await pool.query('SELECT status FROM deliveries WHERE id=$1', [id])).rows[0].status, 'cancelled');
});

test('body inspection preserves exact bytes and does not consume the handler body', async () => {
  const bytes = new Uint8Array([0, 255, 13, 10, 195, 169, 123, 125]);
  const handler = withApiRoute('/api/test', async request => {
    assert.deepEqual(new Uint8Array(await request.arrayBuffer()), bytes);
    return Response.json({ ok: true });
  });
  for (let i = 0; i < 20; i++) {
    const response = await handler(new NextRequest('http://localhost:3000/api/test', { method: 'POST', body: bytes }));
    assert.equal(response.status, 200);
    await response.json();
  }
});

for (const column of ['is_active', 'email_verified']) test(`${column} removal revokes sessions permanently and prevents new sessions`, async () => {
  const refresh = await import('../app/api/mobile/v1/auth/refresh/route.ts');
  await pool.query(`UPDATE users SET ${column}=FALSE WHERE id=$1`, [ids.otherCustomer]);
  assert.equal((await pool.query('SELECT * FROM auth_sessions WHERE user_id=$1', [ids.otherCustomer])).rowCount, 0);
  assert.equal((await call(refresh, 'POST', '/api/mobile/v1/auth/refresh', 'otherCustomer')).status, 401);
  assert.notEqual((await call(routes.login, 'POST', '/api/mobile/v1/auth/login', null, { email: 'othercustomer@example.test', password: 'Example1Password' })).status, 200);
  await pool.query(`UPDATE users SET ${column}=TRUE WHERE id=$1`, [ids.otherCustomer]);
  assert.equal((await call(refresh, 'POST', '/api/mobile/v1/auth/refresh', 'otherCustomer')).status, 401);
  const response = await call(routes.login, 'POST', '/api/mobile/v1/auth/login', null, { email: 'othercustomer@example.test', password: 'Example1Password' });
  assert.equal(response.status, 200); tokens.otherCustomer = (await response.json()).data.access_token;
});

test('expired bearer is rejected and a browser cookie cannot rescue an invalid bearer', async () => {
  const session = await import('../app/api/mobile/v1/auth/session/route.ts');
  const req = new NextRequest('http://localhost:3000/api/mobile/v1/auth/session', { headers: { host: 'localhost:3000', authorization: 'Bearer invalid', cookie: `ezygo.session_token=${tokens.customer}` } });
  assert.equal((await session.GET(req)).status, 401);
  await pool.query("UPDATE auth_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id=$1", [ids.otherCustomer]);
  assert.equal((await call(session, 'GET', '/api/mobile/v1/auth/session', 'otherCustomer')).status, 401);
});

test('Google native handoff binds browser, PKCE and state, hides token and consumes code once', async () => {
  const { createHash } = await import('node:crypto');
  const google = await import('../lib/auth/mobile-oauth.ts');
  const exchange = await import('../app/api/mobile/v1/auth/google/exchange/route.ts');
  const hash = value => createHash('sha256').update(value).digest('base64url');
  const state = 'a'.repeat(64), verifier = 'b'.repeat(64), browser = 'c'.repeat(43), request = 'd'.repeat(43);
  await pool.query('INSERT INTO mobile_oauth_flows (request_id,code_challenge,client_state,browser_hash) VALUES ($1,$2,$3,$4)', [request,hash(verifier),state,hash(browser)]);
  const url = `http://localhost:3000/api/mobile/v1/auth/google/callback?request=${request}`;
  await assert.rejects(google.finishMobileGoogle(new NextRequest(url), request));
  const response = await google.finishMobileGoogle(new NextRequest(url, { headers: { host: 'localhost:3000', cookie: `ezygo.mobile_oauth=${browser}; ezygo.session_token=${tokens.customer}` } }), request);
  const link = new URL(response.headers.get('location'));
  assert.equal(link.protocol, 'ezygo:'); assert.equal(link.searchParams.get('state'), state);
  assert.ok(!response.headers.get('location').includes(tokens.customer));
  const code = link.searchParams.get('code'); assert.ok(code);
  const payload = { state, code, code_verifier: verifier };
  assert.equal((await call(exchange, 'POST', '/api/mobile/v1/auth/google/exchange', null, { ...payload, code_verifier: 'x'.repeat(64) })).status, 400);
  assert.equal((await call(exchange, 'POST', '/api/mobile/v1/auth/google/exchange', null, { ...payload, state: 'x'.repeat(64) })).status, 400);
  const ok = await call(exchange, 'POST', '/api/mobile/v1/auth/google/exchange', null, payload);
  assert.equal(ok.status, 200); assert.equal((await ok.json()).data.access_token, tokens.customer);
  assert.equal((await call(exchange, 'POST', '/api/mobile/v1/auth/google/exchange', null, payload)).status, 400);
});


test('Google start sets browser binding and provider state, and cannot be replayed', async () => {
  const begin = await import('../app/api/mobile/v1/auth/google/route.ts');
  const start = await import('../app/api/mobile/v1/auth/google/start/route.ts');
  const response = await call(begin, 'POST', '/api/mobile/v1/auth/google', null, { state: 'a'.repeat(64), code_challenge: 'b'.repeat(43) });
  assert.equal(response.status, 200);
  const url = (await response.json()).data.authorization_url;
  const request = () => new NextRequest(url, { headers: { host: 'localhost:3000' } });
  const redirect = await start.GET(request());
  assert.equal(redirect.status, 307);
  assert.equal(new URL(redirect.headers.get('location')).hostname, 'accounts.google.com');
  assert.match(redirect.headers.get('set-cookie'), /ezygo.mobile_oauth=/);
  assert.equal((await start.GET(request())).status, 400);
});

test('Google expired handoff and revoked session cannot be exchanged', async () => {
  const { createHash } = await import('node:crypto');
  const google = await import('../lib/auth/mobile-oauth.ts');
  const hash = value => createHash('sha256').update(value).digest('base64url');
  for (const failure of ['expired', 'revoked']) {
    const login = await call(routes.login, 'POST', '/api/mobile/v1/auth/login', null, { email: 'othercustomer@example.test', password: 'Example1Password' });
    const token = (await login.json()).data.access_token;
    const state = 'e'.repeat(64), verifier = 'f'.repeat(64), browser = 'g'.repeat(43), id = failure + randomUUID();
    await pool.query('INSERT INTO mobile_oauth_flows (request_id,code_challenge,client_state,browser_hash) VALUES ($1,$2,$3,$4)', [id,hash(verifier),state,hash(browser)]);
    const url = `http://localhost:3000/api/mobile/v1/auth/google/callback?request=${id}`;
    const response = await google.finishMobileGoogle(new NextRequest(url, { headers: { host: 'localhost:3000', cookie: `ezygo.mobile_oauth=${browser}; ezygo.session_token=${token}` } }), id);
    const code = new URL(response.headers.get('location')).searchParams.get('code');
    assert.ok(code);
    if (failure === 'expired') await pool.query("UPDATE mobile_oauth_flows SET expires_at=NOW()-INTERVAL '1 second' WHERE request_id=$1", [id]);
    else await pool.query('DELETE FROM auth_sessions WHERE user_id=$1', [ids.otherCustomer]);
    await assert.rejects(google.exchangeMobileGoogle({ code, state, code_verifier: verifier }, new Headers({ host: 'localhost:3000' })));
  }
});

test('mobile payment verification checks ownership, amount and signed return before confirming', async () => {
  const login = await call(routes.login, "POST", "/api/mobile/v1/auth/login", null, { email: "othercustomer@example.test", password: "Example1Password" });
  tokens.otherCustomer = (await login.json()).data.access_token;
  const { id, transaction } = await pendingPayment();
  const { signPaymentReturn } = await import('../lib/services/payment-return.ts');
  const token = signPaymentReturn(id, transaction.reference);
  assert.equal((await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'otherCustomer', { token })).status, 404);
  assert.equal((await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'driver', { token })).status, 403);
  assert.equal((await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'customer', { token: 'forged' })).status, 400);
  assert.equal((await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'customer', { token, delivery_id: id + 1 })).status, 400);
  const original = globalThis.fetch;
  let mismatch = true;
  globalThis.fetch = async url => {
    assert.ok(String(url).startsWith('https://api.paystack.co/transaction/verify/'));
    return Response.json({ status: true, data: { ...transaction, amount: mismatch ? 1 : transaction.amount } });
  };
  try {
    const pending = await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'customer', { token });
    assert.equal((await pending.json()).data.status, 'pending');
    mismatch = false;
    const confirmed = await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'customer', { token });
    assert.equal((await confirmed.json()).data.status, 'complete');
    const duplicate = await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'customer', { delivery_id: id });
    assert.equal((await duplicate.json()).data.status, 'complete');
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM delivery_status_logs WHERE delivery_id=$1 AND status='paid'", [id])).rows[0].n, 1);
  } finally { globalThis.fetch = original; }
});

test('mobile checkout callback returns signed app link after provider verification', async () => {
  const { id, transaction } = await pendingPayment();
  const { signPaymentReturn } = await import('../lib/services/payment-return.ts');
  const token = signPaymentReturn(id, transaction.reference);
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ status: true, data: transaction });
  try {
    const response = await call(routes.callback, 'GET', `/api/payments/paystack/callback?reference=${transaction.reference}&app_return=${token}`);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), `ezygo://payment-return?token=${token}`);
  } finally { globalThis.fetch = original; }
});

test('an interrupted checkout can be resumed without creating another delivery', async () => {
  const id = await delivery('confirmed');
  const response = await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'customer', { delivery_id: id });
  assert.equal((await response.json()).data.status, 'not_started');
  assert.equal((await call(routes.verifyPayment, 'POST', '/api/payments/verify', 'otherCustomer', { delivery_id: id })).status, 404);
});

test('mobile places proxy requires a customer and rejects out-of-area provider details', async () => {
  const body = { place_id: 'place-test', session_token: randomUUID() };
  assert.equal((await call(routes.places, 'POST', '/api/places', null, body)).status, 401);
  assert.equal((await call(routes.places, 'POST', '/api/places', 'driver', body)).status, 403);
  process.env.GOOGLE_PLACES_API_KEY = 'test-only-key';
  const original = globalThis.fetch;
  let outside = true;
  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).startsWith('https://places.googleapis.com/v1/places/'));
    assert.equal(init.headers['X-Goog-Api-Key'], 'test-only-key');
    return Response.json({ formattedAddress: 'Long Street, Cape Town', location: { latitude: outside ? -26 : -33.92, longitude: 18.42 }, addressComponents: [{ longText: 'Cape Town', types: ['locality'] }] });
  };
  try {
    assert.equal((await call(routes.places, 'POST', '/api/places', 'customer', body)).status, 400);
    outside = false;
    const response = await call(routes.places, 'POST', '/api/places', 'customer', body);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.city, 'Cape Town');
  } finally { globalThis.fetch = original; delete process.env.GOOGLE_PLACES_API_KEY; }
});

test('customer booking rejects out-of-area addresses on the server', async () => {
  const address = { formatted_address: 'Cape Town', city: 'Cape Town', latitude: -26, longitude: 18.42 };
  const response = await call(routes.booking, 'POST', '/api/deliveries', 'customer', { pickup_address: address, dropoff_address: address, pickup_contact_name: 'Sender', pickup_contact_phone: '+27821234567', recipient_name: 'Recipient', recipient_phone: '+27821234567', parcel_description: 'Documents', payment_method: 'paystack' });
  assert.equal(response.status, 422);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM deliveries')).rows[0].n, 0);
});

test('native booking creates the central quote and payment with a signed app return', async () => {
  const address = { formatted_address: '1 Long Street, Cape Town', city: 'Cape Town', latitude: -33.92, longitude: 18.42 };
  const original = globalThis.fetch;
  let callback;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.paystack.co/transaction/initialize');
    const body = JSON.parse(init.body);
    callback = new URL(body.callback_url);
    return Response.json({ status: true, data: { authorization_url: 'https://checkout.paystack.com/test', access_code: 'test', reference: body.reference } });
  };
  try {
    const response = await call(routes.booking, 'POST', '/api/deliveries', 'customer', { pickup_address: address, dropoff_address: address, pickup_contact_name: 'Sender', pickup_contact_phone: '+27821234567', recipient_name: 'Recipient', recipient_phone: '+27821234567', parcel_description: 'Documents', payment_method: 'paystack' });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    const { verifyPaymentReturn } = await import('../lib/services/payment-return.ts');
    assert.deepEqual(verifyPaymentReturn(callback.searchParams.get('app_return')), { deliveryId: body.data.id, reference: body.data.payment.checkout_id });
    const stored = (await pool.query('SELECT d.status, p.amount, q.amount AS quote_amount FROM deliveries d JOIN quotes q ON q.id=d.quote_id JOIN payments p ON p.delivery_id=d.id WHERE d.id=$1', [body.data.id])).rows[0];
    assert.equal(stored.status, 'confirmed');
    assert.equal(stored.amount, stored.quote_amount);
    assert.equal(Number(stored.amount), body.data.quote.amount);
  } finally { globalThis.fetch = original; }
});

test('queued driver operations are idempotent after a lost response and reject changed payloads', async () => {
  const id = await delivery('in_transit', true);
  const body = { operation_id: randomUUID(), delivery_id: id, status: 'delivered', pin: '123456', note: 'Handed to recipient' };
  const responses = await Promise.all([call(routes.status, 'PATCH', '/api/driver/status', 'driver', body), call(routes.status, 'PATCH', '/api/driver/status', 'driver', body)]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  const replay = await call(routes.status, 'PATCH', '/api/driver/status', 'driver', body);
  assert.equal(replay.status, 200);
  const changed = await call(routes.status, 'PATCH', '/api/driver/status', 'driver', { ...body, pin: '000000' });
  assert.equal(changed.status, 409);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM delivery_status_logs WHERE delivery_id=$1 AND status='delivered'", [id])).rows[0].n, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM driver_operation_receipts WHERE operation_id=$1', [body.operation_id])).rows[0].n, 1);
});

test('PIN failure does not create a success receipt and ownership is checked for new operations', async () => {
  const id = await delivery('in_transit', true);
  const body = { operation_id: randomUUID(), delivery_id: id, status: 'delivered', pin: '000000' };
  assert.equal((await call(routes.status, 'PATCH', '/api/driver/status', 'driver', body)).status, 400);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM driver_operation_receipts WHERE operation_id=$1', [body.operation_id])).rows[0].n, 0);
  assert.equal((await call(routes.status, 'PATCH', '/api/driver/status', 'otherDriver', { ...body, pin: '123456' })).status, 404);
});

test('trip location rejects old/future/unassigned points and ignores out-of-order retries', async () => {
  const id = await delivery('assigned');
  const body = { delivery_id: id, latitude: -33.92, longitude: 18.42, accuracy: 15, recorded_at: new Date().toISOString() };
  assert.equal((await call(routes.location, 'PATCH', '/api/driver/location', 'driver', body)).status, 200);
  assert.equal((await call(routes.location, 'PATCH', '/api/driver/location', 'otherDriver', body)).status, 409);
  assert.equal((await call(routes.location, 'PATCH', '/api/driver/location', 'driver', { ...body, recorded_at: new Date(Date.now() - 61000).toISOString() })).status, 400);
  assert.equal((await call(routes.location, 'PATCH', '/api/driver/location', 'driver', { ...body, recorded_at: new Date(Date.now() + 30000).toISOString() })).status, 400);
  assert.equal((await call(routes.location, 'PATCH', '/api/driver/location', 'driver', { ...body, latitude: -34, recorded_at: new Date(Date.parse(body.recorded_at) - 1000).toISOString() })).status, 200);
  const row = (await pool.query('SELECT current_latitude, location_accuracy FROM drivers WHERE user_id=$1', [ids.driver])).rows[0];
  assert.equal(Number(row.current_latitude), body.latitude); assert.equal(row.location_accuracy, 15);
  await pool.query("UPDATE deliveries SET status='cancelled' WHERE id=$1", [id]);
  assert.equal((await call(routes.location, 'PATCH', '/api/driver/location', 'driver', body)).status, 409);
});

test('stop sharing clears only the caller’s old location and does not erase a later restart', async () => {
  const id = await delivery('assigned');
  const time = new Date().toISOString();
  await call(routes.location, 'PATCH', '/api/driver/location', 'driver', { delivery_id: id, latitude: -33.92, longitude: 18.42, recorded_at: time });
  assert.equal((await call(routes.location, 'DELETE', '/api/driver/location', 'customer', { stopped_at: time })).status, 403);
  await call(routes.location, 'DELETE', '/api/driver/location', 'driver', { stopped_at: new Date(Date.parse(time)-1000).toISOString() });
  assert.notEqual((await pool.query('SELECT current_latitude FROM drivers WHERE user_id=$1', [ids.driver])).rows[0].current_latitude, null);
  await call(routes.location, 'DELETE', '/api/driver/location', 'driver', { stopped_at: new Date().toISOString() });
  assert.equal((await pool.query('SELECT current_latitude FROM drivers WHERE user_id=$1', [ids.driver])).rows[0].current_latitude, null);
});

test('native installations require identity proof and bind to the current session', async () => {
 const input={installation_id:randomUUID(),installation_secret:'a'.repeat(64),expo_token:'ExpoPushToken[test_installation]',platform:'ios'};
 assert.equal((await call(routes.installations,'POST','/api/mobile/v1/installations',null,input)).status,401);
 assert.equal((await call(routes.installations,'POST','/api/mobile/v1/installations','customer',input)).status,200);
 assert.equal((await call(routes.installations,'POST','/api/mobile/v1/installations','otherCustomer',{...input,installation_secret:'b'.repeat(64)})).status,409);
 assert.equal((await call(routes.installations,'POST','/api/mobile/v1/installations','otherCustomer',input)).status,200);
 assert.equal((await pool.query('SELECT user_id FROM native_installations WHERE id=$1',[input.installation_id])).rows[0].user_id,ids.otherCustomer);
 await call(routes.installations,'DELETE','/api/mobile/v1/installations',null,{installation_id:input.installation_id,installation_secret:'b'.repeat(64)});
 assert.equal((await pool.query('SELECT id FROM native_installations WHERE id=$1',[input.installation_id])).rowCount,1);
 await call(routes.installations,'DELETE','/api/mobile/v1/installations',null,input);
 assert.equal((await pool.query('SELECT id FROM native_installations WHERE id=$1',[input.installation_id])).rowCount,0);
});
test('live location is owner-only, trip-bound, stale-labelled, and erased off duty', async()=>{
 const id=await delivery(); const path=`/api/deliveries/${id}/location`;
 const read=()=>call(routes.live,'GET',path,'customer',undefined,id);
 assert.equal((await (await read()).json()).data.location,null);
 assert.equal((await call(routes.live,'GET',path,'otherCustomer',undefined,id)).status,404);
 assert.equal((await call(routes.live,'GET',path,'driver',undefined,id)).status,403);
 const point={delivery_id:id,latitude:-33.92,longitude:18.42,accuracy:20,recorded_at:new Date().toISOString()};
 assert.equal((await call(routes.location,'PATCH','/api/driver/location','driver',point)).status,200);
 assert.equal((await (await read()).json()).data.location.latitude,point.latitude);
 await pool.query("UPDATE drivers SET location_updated_at=NOW()-INTERVAL '2 minutes' WHERE id=$1",[ids.driverProfile]);
 assert.equal((await (await read()).json()).data.location.stale,true);
 await pool.query("UPDATE drivers SET location_updated_at=NOW()-INTERVAL '6 minutes' WHERE id=$1",[ids.driverProfile]);
 assert.equal((await (await read()).json()).data.location,null);
 assert.equal((await call(routes.duty,'PATCH','/api/driver/duty','driver',{on_duty:false})).status,200);
 assert.equal((await call(routes.location,'PATCH','/api/driver/location','driver',{...point,recorded_at:new Date().toISOString()})).status,403);
 assert.equal((await (await read()).json()).data.location,null);
});
test('implausible jumps rejected and terminal delivery removes position atomically',async()=>{
 const id=await delivery();const point={delivery_id:id,latitude:-33.92,longitude:18.42,recorded_at:new Date(Date.now()-1000).toISOString()};
 assert.equal((await call(routes.location,'PATCH','/api/driver/location','driver',point)).status,200);
 assert.equal((await call(routes.location,'PATCH','/api/driver/location','driver',{...point,longitude:18.7,recorded_at:new Date().toISOString()})).status,400);
 await pool.query("UPDATE deliveries SET status='failed' WHERE id=$1",[id]);
 assert.equal((await pool.query('SELECT current_latitude FROM drivers WHERE id=$1',[ids.driverProfile])).rows[0].current_latitude,null);
 assert.equal((await pool.query("SELECT * FROM native_push_events WHERE delivery_id=$1 AND kind='failed'",[id])).rowCount,1);
 await pool.query("UPDATE deliveries SET status='failed' WHERE id=$1",[id]);
 assert.equal((await pool.query("SELECT * FROM native_push_events WHERE delivery_id=$1 AND kind='failed'",[id])).rowCount,1);
});
test('push worker sends committed events, records receipts, and retires invalid tokens',async()=>{
 const input={installation_id:randomUUID(),installation_secret:'c'.repeat(64),expo_token:'ExpoPushToken[worker_test]',platform:'android'};
 await call(routes.installations,'POST','/api/mobile/v1/installations','customer',input);
 const id=await delivery('pending');
 await pool.query("UPDATE deliveries SET status='confirmed' WHERE id=$1",[id]);
 const {processNativeOperations}=await import('../lib/services/native-push.ts');
 const original=globalThis.fetch;let sends=0;
 globalThis.fetch=async(url,options)=>{
  if(String(url).endsWith('/send')){sends++;const body=JSON.parse(options.body);assert.equal(body[0].data.delivery_id,id);assert.equal(body[0].title,'Payment action required');return Response.json({data:[{status:'ok',id:'ticket-test'}]});}
  return Response.json({data:{'ticket-test':{status:'error',details:{error:'DeviceNotRegistered'}}}});
 };
 try{
  await processNativeOperations();assert.equal(sends,1);
  await processNativeOperations();assert.equal(sends,1);
  await pool.query("UPDATE native_push_jobs SET next_attempt_at=NOW() WHERE ticket_id='ticket-test'");
  await processNativeOperations();assert.equal(sends,1);
  assert.equal((await pool.query('SELECT enabled FROM native_installations WHERE id=$1',[input.installation_id])).rows[0].enabled,false);
 }finally{globalThis.fetch=original;await call(routes.installations,'DELETE','/api/mobile/v1/installations',null,input);}
});
test('expired sessions hide location and the worker removes expired operational data',async()=>{
 const id=await delivery();
 await call(routes.location,'PATCH','/api/driver/location','driver',{delivery_id:id,latitude:-33.92,longitude:18.42,recorded_at:new Date().toISOString()});
 const session=(await pool.query('SELECT location_session_id FROM drivers WHERE id=$1',[ids.driverProfile])).rows[0].location_session_id;
 const saved=(await pool.query('SELECT expires_at FROM auth_sessions WHERE id=$1',[session])).rows[0].expires_at;
 try{
  await pool.query("UPDATE auth_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[session]);
  assert.equal((await (await call(routes.live,'GET',`/api/deliveries/${id}/location`,'customer',undefined,id)).json()).data.location,null);
  const {processNativeOperations}=await import('../lib/services/native-push.ts');await processNativeOperations();
  assert.equal((await pool.query('SELECT current_latitude FROM drivers WHERE id=$1',[ids.driverProfile])).rows[0].current_latitude,null);
 }finally{await pool.query('UPDATE auth_sessions SET expires_at=$2 WHERE id=$1',[session,saved]);}
});
test('payment failures enqueue action-required without inventing a delivery transition',async()=>{
 const {id,payment}=await pendingPayment();
 await pool.query("UPDATE payments SET status='failed' WHERE id=$1",[payment]);
 const event=(await pool.query('SELECT kind,user_id FROM native_push_events WHERE delivery_id=$1',[id])).rows;
 assert.deepEqual(event,[{kind:'confirmed',user_id:ids.customer}]);
 assert.equal((await pool.query('SELECT status FROM deliveries WHERE id=$1',[id])).rows[0].status,'confirmed');
});
