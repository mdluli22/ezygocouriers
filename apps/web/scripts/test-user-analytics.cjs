const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load(file, mocks) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', source)(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
const responses = {
  successResponse: (_, data) => ({ status: 200, data }),
  unauthorizedResponse: () => ({ status: 401 }),
  forbiddenResponse: () => ({ status: 403 }),
  serverErrorResponse: () => ({ status: 500 }),
};

test('Analytics are restricted to admins, including at the API boundary', async () => {
  let session = null;
  let reads = 0;
  const route = load('app/api/admin/analytics/route.ts', {
    '@/lib/auth/session': { getSession: async () => session },
    '@/lib/services/analytics': { getUserAnalytics: async () => { reads++; return { live: 2 }; } },
    '@/lib/api/response': responses,
  });
  assert.equal((await route.GET()).status, 401);
  session = { role: 'customer' };
  assert.equal((await route.GET()).status, 403);
  session = { role: 'driver' };
  assert.equal((await route.GET()).status, 403);
  assert.equal(reads, 0);
  session = { role: 'admin' };
  assert.deepEqual(await route.GET(), { status: 200, data: { live: 2 } });
  assert.equal(reads, 1);
});

test('Presence uses the authenticated identity and rejects cross-site calls', async () => {
  let session = null;
  const writes = [];
  const route = load('app/api/analytics/presence/route.ts', {
    '@/lib/auth/session': { getSession: async () => session },
    '@/lib/services/analytics': { recordPresence: async (...args) => writes.push(args) },
    '@/lib/api/response': responses,
  });
  const request = headers => ({ headers: new Headers(headers), nextUrl: { origin: 'https://ezygocouriers.co.za' } });
  assert.equal((await route.POST(request({}))).status, 401);
  session = { sessionId: 'owned-session', userId: 42 };
  assert.equal((await route.POST(request({ origin: 'https://other.invalid' }))).status, 403);
  assert.equal((await route.POST(request({ 'sec-fetch-site': 'cross-site' }))).status, 403);
  assert.equal(writes.length, 0);
  assert.equal((await route.POST(request({ origin: 'https://ezygocouriers.co.za' }))).status, 200);
  assert.deepEqual(writes, [['owned-session', 42]]);
});
