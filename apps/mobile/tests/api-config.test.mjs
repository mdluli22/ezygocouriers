import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_API_ORIGIN, resolveApiOrigin } from '../lib/api-config.ts';
import { validateGoogleStartUrl } from '../lib/auth/links.ts';

for (const development of [true, false]) test(`email and Google share a working origin without an environment file (development=${development})`, () => {
  for (const missing of [undefined, '', '  ']) {
    const origin = resolveApiOrigin(missing, development);
    assert.equal(origin, DEFAULT_API_ORIGIN);
    const google = `${origin}/api/mobile/v1/auth/google/start?request=test-request`;
    assert.equal(validateGoogleStartUrl(google, origin), google);
  }
});

test('explicit local overrides are normalized and restricted to development builds', () => {
  assert.equal(resolveApiOrigin(' http://10.0.2.2:3000/ ', true), 'http://10.0.2.2:3000');
  assert.equal(resolveApiOrigin('https://staging.example.test/', false), 'https://staging.example.test');
  assert.throws(() => resolveApiOrigin('http://localhost:3000', false), /secure/);
  for (const invalid of ['invalid', 'file:///tmp/api', 'https://user:password@example.test', 'https://example.test/api', 'https://example.test?token=x', 'https://example.test#x']) {
    assert.throws(() => resolveApiOrigin(invalid, true));
  }
});

test('Google handoff cannot escape the configured API origin or use embedded credentials', () => {
  for (const value of ['https://evil.example/api/mobile/v1/auth/google/start', `${DEFAULT_API_ORIGIN}/other`, 'https://user:password@ezygocouriers.co.za/api/mobile/v1/auth/google/start', `${DEFAULT_API_ORIGIN}/api/mobile/v1/auth/google/start#extra`]) {
    assert.throws(() => validateGoogleStartUrl(value, DEFAULT_API_ORIGIN));
  }
});
