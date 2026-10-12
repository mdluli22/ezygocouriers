const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync,existsSync}=require('node:fs');
const {resolve,dirname,extname}=require('node:path');
const ts=require('typescript');
function loader(mocks={}) {
 const cache=new Map();
 function load(file){const filename=resolve(file);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);
 const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const req=name=>{if(name in mocks)return mocks[name];if(name==='@ezygo/contracts/constants')return load('packages/contracts/src/constants.ts');if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.')){const p=resolve(dirname(filename),name);return load(extname(p)?p:existsSync(p+'.ts')?p+'.ts':p+'/index.ts');}return require(name);};
 new Function('require','module','exports',source)(req,module,module.exports);return module.exports;}return load;
}

const { NextRequest } = require('next/server');
function fixture(session) {
 let calls = 0;
 const responseHeaders = new Headers();
 responseHeaders.append('set-cookie', 'ezygo.session_token=renewed; Path=/; HttpOnly; SameSite=Lax');
 responseHeaders.append('set-cookie', 'ezygo.dont_remember=; Path=/; Max-Age=0');
 const load = loader({
  '@/lib/security/seed-account-protection': { productionAccountAllowed: async () => true },
  '@/lib/security/driver-access': { driverIsActive: async () => true },
  '@/lib/security/auth-request': { guardAuthRequest: async () => null },
  'better-auth/cookies': { getSessionCookie: req => req.cookies.get('ezygo.session_token')?.value },
  '@/lib/auth/auth': { auth: { api: { getSession: async options => {
   calls++;
   assert.equal(options.query.disableCookieCache, true);
   assert.equal(options.returnHeaders, true);
   return { response: session, headers: responseHeaders };
  } } } },
 });
 return { proxy: load('proxy.ts').proxy, calls: () => calls };
}
const customer = { user: { id: '1', emailVerified: true, isActive: true, role: 'customer' } };
const request = path => new NextRequest('https://example.com' + path, { headers: { cookie: 'ezygo.session_token=signed' } });
test('Protected navigation forwards all renewal cookies and prevents caching', async () => {
 const f = fixture(customer);
 const response = await f.proxy(request('/dashboard'));
 assert.equal(response.headers.get('x-middleware-next'), '1');
 assert.equal(response.headers.getSetCookie().length, 2);
 assert.match(response.headers.getSetCookie()[0], /session_token=renewed/);
 assert.match(response.headers.get('cache-control'), /no-store/);
});
test('Role and login redirects also preserve renewal cookies', async () => {
 for (const path of ['/admin', '/auth/login']) {
  const response = await fixture(customer).proxy(request(path));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://example.com/dashboard');
  assert.equal(response.headers.getSetCookie().length, 2);
 }
});
test('Expired or inactive sessions cannot enter protected pages', async () => {
 for (const session of [null, { user: { ...customer.user, isActive: false } }]) {
  const response = await fixture(session).proxy(request('/dashboard'));
  assert.equal(response.status, 307);
  assert.match(response.headers.get('location'), /auth\/login/);
  assert.equal(response.headers.getSetCookie().length, 2);
 }
});
test('Public pages and unauthenticated navigation avoid session database reads', async () => {
 const f = fixture(null);
 await f.proxy(request('/legal/cookies'));
 const response = await f.proxy(new NextRequest('https://example.com/dashboard'));
 assert.equal(f.calls(), 0);
 assert.equal(response.status, 307);
});
test('Login contract preserves explicit false, defaults old clients, rejects coercion', () => {
 const { loginSchema } = loader()('packages/contracts/src/schemas/auth.ts');
 const input = { email: 'customer@example.com', password: 'test-only' };
 assert.equal(loginSchema.parse(input).rememberMe, true);
 assert.equal(loginSchema.parse({ ...input, rememberMe: false }).rememberMe, false);
 assert.equal(loginSchema.safeParse({ ...input, rememberMe: 'false' }).success, false);
});
test('Rendering session reads cannot silently renew database expiry', async () => {
 const { getSession } = loader({
  'next/headers': { headers: async () => new Headers() },
  '@/lib/auth/auth': { auth: { api: { getSession: async options => {
   assert.equal(options.query.disableRefresh, true);
   assert.equal(options.query.disableCookieCache, true);
   return null;
  } } } },
  '@/lib/security/seed-account-protection': {},
  '@/lib/security/driver-access': {},
 })('lib/auth/session.ts');
 assert.equal(await getSession(), null);
});
