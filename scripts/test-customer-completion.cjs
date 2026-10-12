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


test('Pagination validates bounds and keeps SQL injection in parameters', () => {
 const {pageSchema,pageWhere,pageResult}=loader()('lib/api/pagination.ts');
 for (const input of [{limit:101},{limit:0},{cursor:-1},{cursor:'abc'},{view:'bad'}]) assert.equal(pageSchema.safeParse(input).success,false);
 const page=pageSchema.parse({limit:2,cursor:20,q:"%' OR TRUE --",view:'history'});
 const params=[7];const sql=pageWhere(page,params,'d.id','d.tracking_number','d.status');
 assert.match(sql,/d.id < \$2/);assert.match(sql,/ILIKE \$3/);assert.equal(sql.includes(page.q),false);assert.equal(params[1],20);
 assert.deepEqual(pageResult([{id:19},{id:18},{id:17}],page),{data:[{id:19},{id:18}],pagination:{nextCursor:18,limit:2}});
 assert.equal(pageResult([{id:17}],page).pagination.nextCursor,null);
});
test('Client distinguishes expired sessions, malformed replies and network failures',async()=>{
 const {requestJson}=loader()('lib/api/client.ts');const original=global.fetch;
 try {
  global.fetch=async()=>new Response('{"message":"hidden"}',{status:401});
  await assert.rejects(requestJson('/test'), /session has expired/);
  global.fetch=async()=>new Response('<html>gateway error</html>',{status:502});
  await assert.rejects(requestJson('/test'), /request failed/);
  global.fetch=async()=>new Response('not-json');
  await assert.rejects(requestJson('/test'), /unreadable response/);
  global.fetch=async()=>{throw new TypeError('Failed to fetch');};
  await assert.rejects(requestJson('/test'), /Connection failed/);
 } finally {global.fetch=original;}
});
test('Auth return paths reject external URLs and backslash redirects',()=>{
 const {safeInternalRedirect}=loader()('lib/auth/navigation.ts');
 for (const path of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/\nevil.invalid']) assert.equal(safeInternalRedirect(path,'/dashboard'),'/dashboard');
 assert.equal(safeInternalRedirect('/dashboard/deliveries/new','/dashboard'),'/dashboard/deliveries/new');
});
test('Configured password reset is expiring, single use, and revokes sessions',async()=>{
 const {betterAuth}=await import('better-auth');const {memoryAdapter}=await import('better-auth/adapters/memory');
 let sent;
 const config=loader({
  'better-auth':{betterAuth:options=>options},
  'better-auth/plugins':{bearer:()=>({id:'test-bearer'}),emailOTP:()=>({id:'test-otp'})},
  '@/lib/db/server':{default:{},query:async()=>({rows:[]})},
  '@/lib/security/seed-account-protection':{productionAccountAllowed:async()=>true},
  '@/lib/email/smtp':{sendPasswordReset:async(email,url)=>{sent={email,url};},sendAuthOtp:async()=>{}},
 })('lib/auth/auth.ts').auth;
 assert.equal(config.emailAndPassword.resetPasswordTokenExpiresIn,1800);
 assert.equal(config.emailAndPassword.revokeSessionsOnPasswordReset,true);
 const db={users:[],auth_accounts:[],auth_sessions:[],auth_verifications:[]};
 const auth=betterAuth({...config,baseURL:'http://localhost:3000',secret:'test-only-secret-with-at-least-32-characters',database:memoryAdapter(db),plugins:[],databaseHooks:undefined,advanced:{cookiePrefix:'ezygo'},emailAndPassword:{...config.emailAndPassword,requireEmailVerification:false}});
 await auth.api.signUpEmail({body:{name:'Reset Test',email:'reset@example.invalid',password:'OldPass123',phone:'+27821234567'}});
 const login=await auth.api.signInEmail({body:{email:'reset@example.invalid',password:'OldPass123'},returnHeaders:true});
 const headers=new Headers({cookie:login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')});
 assert.ok(await auth.api.getSession({headers}));
 await auth.api.requestPasswordReset({body:{email:'reset@example.invalid',redirectTo:'http://localhost:3000/auth/reset-password'}});
 const token=new URL(sent.url).pathname.split('/').at(-1);
 await auth.api.resetPassword({body:{token,newPassword:'NewPass123'}});
 assert.equal(await auth.api.getSession({headers}),null);
 await assert.rejects(auth.api.resetPassword({body:{token,newPassword:'AnotherPass123'}}));
 await assert.rejects(auth.api.signInEmail({body:{email:'reset@example.invalid',password:'OldPass123'}}));
 assert.ok(await auth.api.signInEmail({body:{email:'reset@example.invalid',password:'NewPass123'}}));
 await auth.api.requestPasswordReset({body:{email:'reset@example.invalid'}});
 const expiredToken=new URL(sent.url).pathname.split('/').at(-1);
 for(const rows of Object.values(db)) for(const row of rows) if(String(row.identifier).includes(expiredToken)) {
  row.expiresAt=new Date(0); row.expires_at=new Date(0);
 }
 await assert.rejects(auth.api.resetPassword({body:{token:expiredToken,newPassword:'NeverPass123'}}));
 sent=null;
 const missing=await auth.api.requestPasswordReset({body:{email:'missing@example.invalid'}});
 assert.equal(missing.status,true);assert.equal(sent,null);
});

test('Money formatting never turns a missing quote into a free delivery',()=>{
 const {formatMoney}=loader()('lib/currency.ts');
 assert.equal(formatMoney(null),'Quote pending');assert.equal(formatMoney('bad'),'Quote pending');
 assert.equal(formatMoney('123.45','ZAR'),formatMoney(123.45,'ZAR'));
 assert.match(formatMoney(0,'ZAR'),/0[.,]00/);
});
test('Customer, driver and admin query builders bound records and preserve ownership',async()=>{
 const calls=[];
 const query=async(sql,params)=>{calls.push({sql,params});return {rows:[{id:9,distance_meters:1000},{id:8,distance_meters:1000},{id:7,distance_meters:1000}]};};
 const mocks={
  '@/lib/db/server':{query},'@ezygo/contracts':{},
  '@/lib/api/errors':{BusinessError:class extends Error{}},
  '@/lib/earnings/route-distance':{},'@/lib/earnings/service':{},
  '@/lib/security/rate-limit':{},'@/lib/delivery-pin':{},
  '@/lib/services/push-notifications':{},'./driver-assignment':{},'./quotes':{},'./payment-reviews':{},'./notification-outbox':{},
 };
 const load=loader(mocks);
 const customer=load('lib/services/deliveries.ts'),driver=load('lib/services/drivers.ts'),admin=load('lib/services/admin.ts');
 const page={limit:2,cursor:10,q:'Cape',view:'active'};
 const customerPage=await customer.getCustomerDeliveries(42,page);
 assert.match(calls.at(-1).sql,/WHERE d.customer_id = \$1/);assert.deepEqual(calls.at(-1).params,[42,10,'%Cape%',3]);
 assert.equal(customerPage.pagination.nextCursor,8);assert.equal(customerPage.data.length,2);
 await driver.getDriverDeliveries(43,page);assert.match(calls.at(-1).sql,/WHERE dr.user_id = \$1/);assert.equal(calls.at(-1).params[0],43);
 await admin.getAdminUsers('customer',page);assert.deepEqual(calls.at(-1).params,['customer',10,'%Cape%',3]);
 await admin.getAdminDeliveries('paid',page);assert.deepEqual(calls.at(-1).params,['paid',10,'%Cape%',3]);
 await admin.getAdminDrivers(page);assert.deepEqual(calls.at(-1).params,[10,'%Cape%',3]);
 for(const call of calls) {assert.match(call.sql,/ORDER BY (d\.|dr\.)?id DESC LIMIT \$\d+/);assert.equal(call.sql.includes('Cape'),false);}
});
