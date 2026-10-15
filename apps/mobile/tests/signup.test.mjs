import test from 'node:test';
import assert from 'node:assert/strict';
import { signupStageErrors } from '../lib/signup.ts';
import { signupSchema } from '@ezygo/contracts';
const form = { full_name: 'Test Customer', email: 'customer@example.test', phone: '+27821234567', password: '', confirm_password: '' };
test('details can advance before a password is entered, but require a valid phone', () => {
  assert.deepEqual(signupStageErrors(form, 1), {});
  for (const phone of ['', '123', 'not a phone']) {
    assert.ok(signupStageErrors({ ...form, phone }, 1).phone);
    assert.equal(signupSchema.safeParse({ ...form, phone, password: 'Password1', confirm_password: 'Password1' }).success, false);
  }
  assert.equal(signupStageErrors(form, 1).password, undefined);
});
test('security stage catches weak passwords and mismatched confirmation', () => {
  assert.ok(signupStageErrors(form, 2).password);
  assert.ok(signupStageErrors({ ...form, password: 'Password1', confirm_password: 'Different1' }, 2).confirm_password);
  assert.deepEqual(signupStageErrors({ ...form, password: 'Password1', confirm_password: 'Password1' }, 2), {});
  assert.equal(signupSchema.parse({ ...form, password: 'Password1', confirm_password: 'Password1' }).phone, '+27821234567');
});
