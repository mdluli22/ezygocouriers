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


const {NextRequest,NextResponse}=require('next/server');
const {createHash}=require('node:crypto');
const sha=v=>createHash('sha256').update(v).digest('base64url');
const request=(path, body)=>new NextRequest('https://ezygocouriers.co.za'+path,body?{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}}:undefined);
function setup(){
 const flows=new Map();let active=true;
 const headers=new Headers();headers.append('set-cookie','provider=nonce; Path=/; HttpOnly');
 const query=async(sql,args=[])=>{
  if(sql.startsWith('INSERT INTO')){flows.set(args[0],{request_id:args[0],code_challenge:args[1],client_state:args[2],browser_hash:null,code_hash:null,encrypted_token:null});return{rows:[],rowCount:1};}
  let flow=flows.get(args[0]);
  if(sql.includes('WHERE code_hash=$1'))flow=[...flows.values()].find(f=>f.code_hash===args[0]);
  if(sql.includes('SET browser_hash')){if(!flow||flow.browser_hash)return{rows:[],rowCount:0};flow.browser_hash=args[1];}
  if(sql.includes('SET code_hash')){if(!flow||flow.code_hash)return{rows:[],rowCount:0};flow.code_hash=args[1];flow.encrypted_token=args[2];}
  if(sql.startsWith('DELETE'))flows.delete(args[0]);
  return{rows:flow?[{...flow}]:[],rowCount:flow?1:0};
 };
 const secure=response=>{response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;};
 const mocks={
  '@/lib/api/response':{errorResponse:(message,errors,status=400,code='BAD_REQUEST')=>NextResponse.json({success:false,message,errors,code},{status}),successResponse:(message,data)=>NextResponse.json({success:true,message,data})},
  '@/lib/security/rate-limit':{consumeRateLimit:async()=>{},RateLimitError:class extends Error{}},
  '@/lib/auth/auth':{auth:{api:{signInSocial:async()=>({response:{url:'https://accounts.google.com/o/oauth2/auth'},headers})},$context:Promise.resolve({authCookies:{sessionToken:{name:'ezygo.session_token',attributes:{httpOnly:true,path:'/'}}}})}},
  './auth':null,
  '@/lib/db/server':{query,getClient:async()=>({query,release(){}})},
  'better-auth/cookies':{getSessionCookie:req=>req.cookies.get('ezygo.session_token')?.value},
 };
 mocks['./auth']=mocks['@/lib/auth/auth'];
 const originalLoad=loader({...mocks,
  '@/lib/auth/mobile-session':{secureMobileResponse:secure},
  './mobile-session':{secureMobileResponse:secure,resolveMobileSession:async(_headers,options)=>active&&options.accessToken==='signed-session'?{accessToken:'signed-session',user:{id:1,role:'customer'},expiresAt:'2099-01-01'}:null,mobileTokenData:session=>({access_token:session.accessToken})},
 });
 const service=originalLoad('lib/auth/mobile-oauth.ts');
 return{...service,flows,revoke(){active=false;},load:originalLoad};
}
process.env.GOOGLE_CLIENT_ID='test-client';process.env.GOOGLE_CLIENT_SECRET='test-only';
process.env.BETTER_AUTH_SECRET='test-only-secret-for-encryption';process.env.BETTER_AUTH_URL='https://ezygocouriers.co.za';
async function authorize(f){
 const verifier='a'.repeat(64),state='b'.repeat(64);
 const started=await f.beginMobileGoogle({state,code_challenge:sha(verifier)});
 const url=new URL(started.authorization_url),id=url.searchParams.get('request');
 assert.equal(url.origin,'https://ezygocouriers.co.za');
 const browser=await f.startMobileGoogle(request(url.pathname+url.search),id);
 assert.match(browser.headers.get('location'),/^https:\/\/accounts.google.com\//);
 const cookie=browser.cookies.get('ezygo.mobile_oauth');assert.equal(cookie.httpOnly,true);assert.equal(cookie.secure,true);
 const callback=new NextRequest(`https://ezygocouriers.co.za/api/mobile/v1/auth/google/callback?request=${id}`,{headers:{cookie:`ezygo.mobile_oauth=${cookie.value}; ezygo.session_token=signed-session`}});
 return{verifier,state,id,callback};
}
test('Google browser handoff encrypts credentials and exchanges a PKCE-bound code once',async()=>{
 const f=setup(),a=await authorize(f);const response=await f.finishMobileGoogle(a.callback,a.id);
 const link=new URL(response.headers.get('location'));assert.equal(link.protocol,'ezygo:');assert.equal(link.host,'auth');
 assert.equal(link.searchParams.get('state'),a.state);assert.equal(link.searchParams.has('access_token'),false);
 const code=link.searchParams.get('code');assert.ok(code);
 const flow=f.flows.get(a.id);assert.equal(flow.code_hash,sha(code));assert.ok(!flow.encrypted_token.includes('signed-session'));
 const input={code,state:a.state,code_verifier:a.verifier};
 await assert.rejects(f.exchangeMobileGoogle({...input,state:'c'.repeat(64)},new Headers()),/invalid/);
 await assert.rejects(f.exchangeMobileGoogle({...input,code_verifier:'d'.repeat(64)},new Headers()),/invalid/);
 assert.equal((await f.exchangeMobileGoogle(input,new Headers())).access_token,'signed-session');
 await assert.rejects(f.exchangeMobileGoogle(input,new Headers()),/invalid/);
});
test('Google redirect preserves provider state cookies alongside mobile browser binding',async()=>{
 const f=setup();
 const started=await f.beginMobileGoogle({state:'b'.repeat(64),code_challenge:sha('a'.repeat(64))});
 const url=new URL(started.authorization_url);
 const response=await f.startMobileGoogle(request(url.pathname+url.search),url.searchParams.get('request'));
 const cookies=response.headers.getSetCookie();
 assert.ok(cookies.some(cookie=>cookie.startsWith('provider=nonce;')), 'provider OAuth state cookie must reach the browser');
 assert.ok(cookies.some(cookie=>cookie.startsWith('ezygo.mobile_oauth=')), 'native browser binding must also reach the browser');
 assert.equal(response.status,307);
});
test('Browser binding is required and browser start cannot be reused',async()=>{
 const f=setup(),a=await authorize(f);
 await assert.rejects(f.finishMobileGoogle(request('/api/mobile/v1/auth/google/callback'),a.id),/invalid/);
 await assert.rejects(f.startMobileGoogle(a.callback,a.id),/invalid/);
});
test('Account eligibility is rechecked before exchanging a completed handoff',async()=>{
 const f=setup(),a=await authorize(f),response=await f.finishMobileGoogle(a.callback,a.id);
 f.revoke();const code=new URL(response.headers.get('location')).searchParams.get('code');
 await assert.rejects(f.exchangeMobileGoogle({code,state:a.state,code_verifier:a.verifier},new Headers()),/invalid/);
});
test('Cancelled Google login returns only state and error, with no exchange code',async()=>{
 const f=setup(),a=await authorize(f);a.callback.nextUrl.searchParams.set('error','oauth_failed');
 const response=await f.finishMobileGoogle(a.callback,a.id),link=new URL(response.headers.get('location'));
 assert.equal(link.searchParams.get('error'),'oauth_failed');assert.equal(link.searchParams.has('code'),false);assert.equal(f.flows.size,0);
});
test('Native Google routes validate requests and return non-cacheable contract errors',async()=>{
 const f=setup();
 for(const [file,method,req] of [
 ['app/api/mobile/v1/auth/google/route.ts','POST',request('/api/mobile/v1/auth/google',{})],
 ['app/api/mobile/v1/auth/google/exchange/route.ts','POST',request('/api/mobile/v1/auth/google/exchange',{})],
 ['app/api/mobile/v1/auth/google/start/route.ts','GET',request('/api/mobile/v1/auth/google/start?request=bad')],
 ['app/api/mobile/v1/auth/google/callback/route.ts','GET',request('/api/mobile/v1/auth/google/callback?request=bad')],
 ]){const response=await f.load(file)[method](req);assert.ok([400,422].includes(response.status));assert.equal((await response.json()).success,false);assert.match(response.headers.get('cache-control'),/no-store/);}
});
