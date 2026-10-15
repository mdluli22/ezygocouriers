import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaymentLink, secureCheckoutUrl } from '../lib/payment-links.ts';
import { createDeliveryRequestSchema } from '@ezygo/contracts';
const token = `abc.${'a'.repeat(64)}`;
test('payment links accept only the exact return route with a single signed token', () => {
  assert.equal(parsePaymentLink(`ezygo://payment-return?token=${token}`), token);
  for (const link of [`https://payment-return?token=${token}`, `ezygo://evil/payment-return?token=${token}`, `ezygo://payment-return?token=${token}&token=${token}`, `ezygo://payment-return?token=${token}&success=true`, `ezygo://payment-return/path?token=${token}`, `ezygo://user@payment-return?token=${token}`, 'ezygo://payment-return?token=unsigned']) assert.throws(() => parsePaymentLink(link));
});
test('checkout matches the provider to its exact HTTPS host', () => {
  assert.equal(secureCheckoutUrl('https://c.yoco.com/checkout/example', 'yoco'), 'https://c.yoco.com/checkout/example');
  assert.equal(secureCheckoutUrl('https://checkout.paystack.com/example', 'paystack'), 'https://checkout.paystack.com/example');
  for (const provider of ['yoco', 'paystack']) {
    const host = provider === 'yoco' ? 'c.yoco.com' : 'checkout.paystack.com';
    for (const url of [`http://${host}/x`, `https://${host}.evil.test/x`, 'https://evil.test/x', `https://user@${host}/x`, `https://${host}:8443/x`, 'javascript:alert(1)']) assert.throws(() => secureCheckoutUrl(url, provider));
  }
  assert.throws(() => secureCheckoutUrl('https://checkout.paystack.com/x', 'yoco'));
  assert.throws(() => secureCheckoutUrl('https://c.yoco.com/x', 'paystack'));
  assert.throws(() => secureCheckoutUrl('https://evil.test/x', 'unknown'));
});
const address = { formatted_address: '1 Long Street, Cape Town', latitude: -33.92, longitude: 18.42, city: 'Cape Town' };
const booking = { pickup_address: address, dropoff_address: address, pickup_contact_name: 'Sender', pickup_contact_phone: '+27821234567', recipient_name: 'Recipient', recipient_phone: '+27821234567', parcel_description: 'Documents', payment_method: 'yoco' };
test('booking accepts selected Cape Town addresses and enforces coordinates and PIN email', () => {
  assert.equal(createDeliveryRequestSchema.safeParse(booking).success, true);
  for (const patch of [{ pickup_address: { ...address, latitude: -26.2 } }, { dropoff_address: { ...address, latitude: undefined } }, { require_pin: true }, { recipient_phone: '123' }]) assert.equal(createDeliveryRequestSchema.safeParse({ ...booking, ...patch }).success, false);
});
