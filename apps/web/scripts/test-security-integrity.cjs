const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync,existsSync}=require('node:fs');
const {resolve,dirname,extname}=require('node:path');
const ts=require('typescript');
function loader(mocks={}) {
 const cache=new Map();
 function load(file){const filename=resolve(file);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);
 const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const req=name=>{if(name in mocks)return mocks[name];if(name==='@ezygo/contracts/constants')return load('../../packages/contracts/src/constants.ts');if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.')){const p=resolve(dirname(filename),name);return load(extname(p)?p:existsSync(p+'.ts')?p+'.ts':p+'/index.ts');}return require(name);};
 new Function('require','module','exports',source)(req,module,module.exports);return module.exports;}return load;
}
test('Push destination rejects private, credentialed and lookalike endpoints',()=>{
 const {allowedPushEndpoint,publicAddress}=loader()('lib/security/push-endpoint.ts');
 for(const url of ['https://127.0.0.1/a','http://fcm.googleapis.com/a','https://fcm.googleapis.com.evil.invalid/a','https://user:pass@fcm.googleapis.com/a','https://fcm.googleapis.com:8443/a','https://[::1]/a'])assert.equal(allowedPushEndpoint(url),false,url);
 for(const url of ['https://fcm.googleapis.com/fcm/send/test','https://updates.push.services.mozilla.com/wpush/v2/test','https://web.push.apple.com/test'])assert.equal(allowedPushEndpoint(url),true,url);
 for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::ffff:127.0.0.1','::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);
});
test('Push DNS resolution rejects a public provider resolving to private space',async()=>{
 const {resolvePushAddress}=loader({'node:dns/promises':{lookup:async()=>[{address:'127.0.0.1'}]}})('lib/security/push-endpoint.ts');
 await assert.rejects(resolvePushAddress('https://fcm.googleapis.com/send/test'),/Unsafe/);
});
test('Push connection stays pinned for both Node DNS callback forms',()=>{
 const {pinnedPushAgent}=loader()('lib/security/push-endpoint.ts');const agent=pinnedPushAgent('8.8.8.8');
 try{agent.options.lookup('ignored-host',{all:false},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'8.8.8.8');assert.equal(family,4);});
 agent.options.lookup('ignored-host',{all:true},(error,addresses)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'8.8.8.8',family:4}]);});}
 finally{agent.destroy();}
});
test('Outbox encryption authenticates ciphertext and hides PIN and recipient',()=>{
 const previous=process.env.NOTIFICATION_ENCRYPTION_KEY;
 process.env.NOTIFICATION_ENCRYPTION_KEY='test-only-secret-much-longer-than-thirty-two-characters';
 try {const {encryptPayload,decryptPayload}=loader()('lib/security/encryption.ts');const payload={pin:'123456',email:'private@example.invalid'};const encrypted=encryptPayload(payload);assert.equal(encrypted.includes(payload.pin),false);assert.equal(encrypted.includes(payload.email),false);assert.deepEqual(decryptPayload(encrypted),payload);const parts=encrypted.split('.');parts[1]=Buffer.alloc(16).toString('base64url');assert.throws(()=>decryptPayload(parts.join('.')));}finally{if(previous===undefined)delete process.env.NOTIFICATION_ENCRYPTION_KEY;else process.env.NOTIFICATION_ENCRYPTION_KEY=previous;}
});
test('Custom web and mobile login share throttling and raw signup is closed',async()=>{
 const {NextRequest}=require('next/server');let counts=new Map();
 class RateLimitError extends Error{constructor(retryAfter){super('Too many attempts');this.retryAfter=retryAfter;}}
 const {guardAuthRequest}=loader({'./rate-limit':{RateLimitError,consumeRateLimit:async(key,max)=>{const hits=(counts.get(key)||0)+1;counts.set(key,hits);if(hits>max)throw new RateLimitError(60);}}})('lib/security/auth-request.ts');
 const request=(path,email='test@example.invalid')=>new NextRequest('http://localhost:3000'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'test-only'})});
 for(let i=0;i<10;i++)assert.equal(await guardAuthRequest(request(i%2?'/api/mobile/v1/auth/login':'/api/auth/login')),null);
 const limited=await guardAuthRequest(request('/api/mobile/v1/auth/login','TEST@example.invalid'));assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');
 assert.equal((await guardAuthRequest(request('/api/auth/sign-up/email'))).status,404);
 assert.equal(await guardAuthRequest(new NextRequest('http://localhost:3000/api/payments/yoco/webhook',{method:'POST'})),null);
});
test('Authentication fails closed when its shared limiter is unavailable',async()=>{
 const {NextRequest}=require('next/server');class RateLimitError extends Error{}
 const {guardAuthRequest}=loader({'./rate-limit':{RateLimitError,consumeRateLimit:async()=>{throw Error('database unavailable');}}})('lib/security/auth-request.ts');
 const response=await guardAuthRequest(new NextRequest('http://localhost:3000/api/auth/login',{method:'POST',body:'{}'}));assert.equal(response.status,503);
});
test('Checkout retries reuse stored provider response without network calls',async()=>{
 const {createYocoCheckout}=loader({'@/lib/db/server':{query:async()=>({rows:[{checkout_response:{id:'existing',redirectUrl:'https://payments.yoco.com/test'}}]})}})('lib/yoco/index.ts');
 const checkout=await createYocoCheckout({paymentId:1,deliveryId:2,trackingNumber:'TEST',amount:99,currency:'ZAR'});assert.equal(checkout.id,'existing');
});
test('Production rejects historical seed credentials, including existing sessions',async()=>{
 const original=process.env.NODE_ENV;
 const seed=readFileSync('../../scripts/dev-seeds/seed_test_users.sql','utf8').match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/)[0];
 let password=seed;
 const {productionAccountAllowed}=loader({'@/lib/db/server':{query:async()=>({rows:[{password}]})}})('lib/security/seed-account-protection.ts');
 try {process.env.NODE_ENV='production';assert.equal(await productionAccountAllowed(1),false);password='unique-test-hash';assert.equal(await productionAccountAllowed(1),true);password=seed;process.env.NODE_ENV='development';assert.equal(await productionAccountAllowed(1),true);}
 finally {if(original===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=original;}
});
