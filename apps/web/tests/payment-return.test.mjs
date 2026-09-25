import test from 'node:test';
import assert from 'node:assert/strict';
import { signPaymentReturn, verifyPaymentReturn } from '../lib/services/payment-return.ts';
process.env.BETTER_AUTH_SECRET = 'test-only-payment-return-secret';
test('payment returns bind delivery and checkout, reject tampering, expire, and fail closed', () => {
  const token = signPaymentReturn(42, 'reference-123');
  assert.deepEqual(verifyPaymentReturn(token), { deliveryId: 42, reference: 'reference-123' });
  const [payload, mac] = token.split('.');
  const altered = Buffer.from(JSON.stringify({ deliveryId: 43, reference: 'reference-123', expires: Date.now() + 60000 })).toString('base64url');
  for (const invalid of [`${altered}.${mac}`, `${payload}.${'0'.repeat(64)}`, `${token}.extra`, 'invalid', 'x'.repeat(2049)]) assert.equal(verifyPaymentReturn(invalid), null);
  const now = Date.now; Date.now = () => now() + 25 * 60 * 60 * 1000;
  try { assert.equal(verifyPaymentReturn(token), null); } finally { Date.now = now; }
});
