const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { createHmac } = require('node:crypto');
const ts = require('typescript');

// Load server TypeScript with isolated dependencies; no database or payment calls.
function load(file, mocks = {}) {
  const filename = resolve(__dirname, '..', file);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(resolve(dirname(filename), name + '.ts'), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}

test('checkout contract accepts Yoco and rejects disabled gateways', () => {
  const { createPaymentSchema } = load('packages/contracts/src/schemas/payment.ts');
  for (const provider of ['yoco', 'paystack', 'payfast']) {
    assert.equal(createPaymentSchema.safeParse({ delivery_id: 1, payment_method: provider }).success, provider === 'yoco');
  }
});

test('checkout records Yoco and returns its hosted URL and checkout ID', async () => {
  const { initialisePaymentCheckout } = load('lib/services/payment-checkout.ts', {
    './payments': { createPaymentRecord: async (input) => { assert.equal(input.provider, 'yoco'); return 7; } },
    '@/lib/yoco': { createYocoCheckout: async (input) => {
      assert.equal(input.paymentId, 7);
      assert.equal(input.amount, 99);
      return { id: 'checkout_test', redirectUrl: 'https://checkout.yoco.com/test', processingMode: 'test' };
    } },
  });
  const result = await initialisePaymentCheckout({ provider: 'yoco', delivery: {
    id: 1, quoteId: 2, customerId: 3, trackingNumber: 'EZ123', amount: 99, currency: 'ZAR', customerEmail: 'test@example.com',
  } });
  assert.deepEqual(result, { provider: 'yoco', redirect_url: 'https://checkout.yoco.com/test', checkout_id: 'checkout_test', demo_mode: true, payment_id: 7, delivery_id: 1 });
});

test('disabled callbacks cannot execute their old payment handlers', async () => {
  for (const [file, method] of [
    ['paystack/callback', 'GET'], ['paystack/webhook', 'POST'], ['callback', 'POST'], ['sandbox-confirm', 'POST'],
  ]) {
    const route = load(`app/api/payments/${file}/route.ts`);
    assert.equal((await route[method]()).status, 503);
  }
});

test('Yoco webhook verifies signatures and rejects tampered or stale events', () => {
  const keys = ['YOCO_SANDBOX', 'YOCO_SECRET_KEY', 'YOCO_WEBHOOK_SECRET', 'YOCO_APP_URL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    const secret = Buffer.from('test-only-webhook-secret');
    Object.assign(process.env, { YOCO_SANDBOX: 'true', YOCO_SECRET_KEY: 'sk_test_fake', YOCO_WEBHOOK_SECRET: `whsec_${secret.toString('base64')}`, YOCO_APP_URL: 'https://example.com' });
    const { verifyYocoWebhook, getYocoConfig } = load('lib/yoco/index.ts', { '@/lib/db/server': {} });
    const event = { rawBody: '{"type":"payment.succeeded"}', webhookId: 'event_test', webhookTimestamp: String(Math.floor(Date.now() / 1000)) };
    const sign = data => 'v1,' + createHmac('sha256', secret).update(`${data.webhookId}.${data.webhookTimestamp}.${data.rawBody}`).digest('base64');
    assert.equal(verifyYocoWebhook({ ...event, webhookSignature: sign(event) }), true);
    assert.equal(verifyYocoWebhook({ ...event, rawBody: '{}', webhookSignature: sign(event) }), false);
    const stale = { ...event, webhookTimestamp: String(Number(event.webhookTimestamp) - 600) };
    assert.equal(verifyYocoWebhook({ ...stale, webhookSignature: sign(stale) }), false);
    process.env.YOCO_SECRET_KEY = 'sk_live_fake';
    assert.throws(getYocoConfig, /test secret key/);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('Yoco completion requires valid signature, provider, mode, currency and amount', async () => {
  let completed = 0;
  let validSignature = true;
  const payment = { id: 7, delivery_id: 1, amount: '99.00', currency: 'ZAR', status: 'pending', provider: 'yoco' };
  const { POST } = load('app/api/payments/yoco/webhook/route.ts', {
    '@/lib/db/server': { query: async () => ({ rows: [payment] }) },
    '@/lib/yoco': { getYocoConfig: () => ({ sandbox: true }), verifyYocoWebhook: () => validSignature },
    '@/lib/services/payments': { completePayment: async () => { completed++; }, failPayment: async () => assert.fail('Unexpected failure completion') },
  });
  const payload = { id: 'payment_test', amount: 9900, currency: 'ZAR', status: 'succeeded', mode: 'test', metadata: { checkoutId: 'checkout_test' } };
  const send = data => POST(new Request('https://example.com/api/payments/yoco/webhook', { method: 'POST', body: JSON.stringify({ type: 'payment.succeeded', payload: data }) }));
  validSignature = false;
  assert.equal((await send(payload)).status, 400);
  validSignature = true;
  for (const mismatch of [{ mode: 'live' }, { amount: 1 }, { currency: 'USD' }, { metadata: {} }]) {
    assert.equal((await send({ ...payload, ...mismatch })).status, 400);
  }
  payment.provider = 'paystack';
  assert.equal((await send(payload)).status, 409);
  payment.provider = 'yoco';
  assert.equal(completed, 0);
  assert.equal((await send(payload)).status, 200);
  assert.equal(completed, 1);
});
