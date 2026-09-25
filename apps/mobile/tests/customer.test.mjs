import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaymentLink, secureCheckoutUrl } from '../lib/payment-links.ts';
import { createDeliveryRequestSchema } from '@ezygo/contracts';
const token = `abc.${'a'.repeat(64)}`;
test('payment links accept only the exact return route with a single signed token', () => {
  assert.equal(parsePaymentLink(`ezygo://payment-return?token=${token}`), token);
  for (const link of [`https://payment-return?token=${token}`, `ezygo://evil/payment-return?token=${token}`, `ezygo://payment-return?token=${token}&token=${token}`, `ezygo://payment-return?token=${token}&success=true`, `ezygo://payment-return/path?token=${token}`, `ezygo://user@payment-return?token=${token}`, 'ezygo://payment-return?token=unsigned']) assert.throws(() => parsePaymentLink(link));
});
test('checkout opens HTTPS Paystack only, without userinfo or alternate ports', () => {
  assert.equal(secureCheckoutUrl('https://checkout.paystack.com/example'), 'https://checkout.paystack.com/example');
  for (const url of ['http://checkout.paystack.com/x', 'https://checkout.paystack.com.evil.test/x', 'https://evil.test/x', 'https://user@checkout.paystack.com/x', 'https://checkout.paystack.com:8443/x', 'javascript:alert(1)']) assert.throws(() => secureCheckoutUrl(url));
});
const address = { formatted_address: '1 Long Street, Cape Town', latitude: -33.92, longitude: 18.42, city: 'Cape Town' };
const booking = { pickup_address: address, dropoff_address: address, pickup_contact_name: 'Sender', pickup_contact_phone: '+27821234567', recipient_name: 'Recipient', recipient_phone: '+27821234567', parcel_description: 'Documents', payment_method: 'paystack' };
test('booking accepts selected Cape Town addresses and enforces coordinates and PIN email', () => {
  assert.equal(createDeliveryRequestSchema.safeParse(booking).success, true);
  for (const patch of [{ pickup_address: { ...address, latitude: -26.2 } }, { dropoff_address: { ...address, latitude: undefined } }, { require_pin: true }, { recipient_phone: '123' }]) assert.equal(createDeliveryRequestSchema.safeParse({ ...booking, ...patch }).success, false);
});
