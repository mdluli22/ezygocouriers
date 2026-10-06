const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
const ts=require('typescript');
function load(file,mocks={}) {
 const filename=resolve(__dirname,'..',file);
 const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 const localRequire=name=>name in mocks?mocks[name]:name.startsWith('.')?load(resolve(dirname(filename),name+'.ts'),mocks):require(name);
 new Function('require','module','exports',source)(localRequire,module,module.exports);return module.exports;
}
const calc=load('lib/earnings/calculation.ts');
test('PDF distance examples and exact tier boundaries',()=>{
 for(const [meters,cents] of [[0,3200],[4000,3200],[5000,3200],[5001,3500],[8000,3500],[10000,3500],[10001,3900],[13000,3900],[15000,3900],[15001,4400],[18000,4400],[20000,4400],[20001,5000],[23000,5000],[25000,5000],[25001,5700],[28000,5700],[30000,5700],[30001,null],[null,null],[-1,null],[NaN,null],[1.1,null]])assert.equal(calc.deliveryPayCents(meters),cents);
 assert.equal(calc.distanceLabel(5001),'5.1 km');
});
test('Monthly progressive bonus matches PDF example and each threshold',()=>{
 for(const [count,cents] of [[0,0],[149,0],[150,200],[249,20000],[250,20400],[275,30400],[349,60000],[350,60600],[449,120000],[450,120800]])assert.equal(calc.monthlyBonusCents(count),cents);
});
test('South African Sunday cutoff, Monday pay date, month and year boundaries',()=>{
 assert.equal(calc.weekStart(new Date('2026-10-04T21:59:59Z')),'2026-09-28');
 assert.equal(calc.weekStart(new Date('2026-10-04T22:00:00Z')),'2026-10-05');
 const period=calc.weekPeriod('2026-09-28');
 assert.equal(period.end,'2026-10-04');assert.equal(period.payDate,'2026-10-05');
 assert.equal(new Date(period.until).toISOString(),'2026-10-04T22:00:00.000Z');
 assert.equal(calc.weekStart(new Date('2027-01-01T00:00:00Z')),'2026-12-28');
 assert.equal(calc.monthPeriod('2026-12').until,'2027-01-01T00:00:00+02:00');
 for(const invalid of ['2026-10-06','2026-02-30','invalid'])assert.throws(()=>calc.weekPeriod(invalid));
});
test('Completion snapshots amount and driver once, including manual review cases',async()=>{
 const calls=[];const client={query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}};
 const service=load('lib/earnings/service.ts',{'@/lib/db/server':{},'./route-distance':{}});
 await service.recordCompletion(client,1,7,8000);
 assert.deepEqual(calls[1].args,[1,7,8000,3500,'rider-pay-v1','google_routes']);
 assert.match(calls[1].sql,/ON CONFLICT\(delivery_id\) DO NOTHING/);
 await service.recordCompletion(client,2,7,null);assert.equal(calls[3].args[3],null);
 await service.recordCompletion(client,3,7,31000);assert.equal(calls[5].args[3],null);
});
test('Weekly report scopes drivers, excludes undated pay and keeps monthly bonus separate',async()=>{
 let n=0;const query=async(sql,args)=>{
 assert.ok(args.includes(99),'driver user filter propagated to every report query');
 return {rows:[[{id:7,full_name:'Test Driver'}],[{driver_id:7,delivery_id:1,completed_at:new Date(),distance_meters:8000,amount_cents:3500},{driver_id:7,delivery_id:2,completed_at:null,distance_meters:null,amount_cents:null}],[{driver_id:7,count:275}],[{driver_id:7,amount_cents:3500,paid_at:new Date(),reference:'test'}]][n++]};
 };
 const service=load('lib/earnings/service.ts',{'@/lib/db/server':{query},'./route-distance':{}});
 const report=await service.earningsReport('2026-09-28','2026-09',99);const driver=report.drivers[0];
 assert.equal(driver.completedCount,1);assert.equal(driver.pendingCount,1);assert.equal(driver.totalCents,3500);assert.equal(driver.owedCents,0);assert.equal(driver.monthlyBonusCents,30400);
});
test('Unresolved earnings and duplicate payments cannot be recorded',async()=>{
 for(const pending of [true,false]){
 let inserted=false,rolledBack=false;
 const client={release(){},query:async(sql)=>{
 if(sql.startsWith('SELECT *'))return {rows:[{completed_at:new Date('2026-09-29'),amount_cents:pending?null:3500}]};
 if(sql.startsWith('INSERT')){inserted=true;return {rowCount:0,rows:[]};}
 if(sql==='ROLLBACK')rolledBack=true;
 return {rows:[]};
 }};
 const service=load('lib/earnings/service.ts',{'@/lib/db/server':{getClient:async()=>client},'./route-distance':{}});
 await assert.rejects(service.recordWeeklyPayment(7,'2026-09-28','test-ref',1,3500),pending?/Resolve pending/:/already been recorded/);
 assert.equal(inserted,!pending);assert.ok(rolledBack);
 }
});
test('Paid weeks are locked against admin amount changes',async()=>{
 const client={release(){},query:async(sql)=>{
 if(sql.startsWith('SELECT driver_id'))return {rows:[{driver_id:7}]};
 if(sql.startsWith('SELECT *'))return {rows:[{driver_id:7,completed_at:new Date('2026-09-29')}]};
 if(sql.startsWith('SELECT id FROM driver_weekly_payouts'))return {rowCount:1,rows:[{id:1}]};
 assert.ok(!sql.startsWith('UPDATE'));return {rows:[]};
 }};
 const service=load('lib/earnings/service.ts',{'@/lib/db/server':{getClient:async()=>client},'./route-distance':{}});
 await assert.rejects(service.approveEarning({deliveryId:1,meters:8000,note:'verified route'},1),/already paid/);
});
test('Unauthenticated and customer requests cannot read or mutate earnings',async()=>{
 const responseMocks={unauthorizedResponse:()=>({status:401}),forbiddenResponse:()=>({status:403})};
 for(const role of [null,'customer'])for(const file of ['admin','driver']){
 const route=load(`app/api/${file}/earnings/route.ts`,{'@/lib/auth/session':{getSession:async()=>role?{role,userId:99}:null},'@/lib/api/response':responseMocks,'@/lib/api/validation':{},'@/lib/earnings/service':{},'@/lib/earnings/calculation':calc});
 assert.equal((await route.GET({})).status,role?403:401);
 if(file==='admin')assert.equal((await route.POST({})).status,role?403:401);
 }
});
test('Payment rejects a changed amount and an unfinished week',async()=>{
 let inserted=false;
 const client={release(){},query:async sql=>{
 if(sql.startsWith('SELECT *'))return {rows:[{completed_at:new Date('2026-09-29'),amount_cents:4400}]};
 if(sql.startsWith('INSERT'))inserted=true;return {rows:[]};
 }};
 const service=load('lib/earnings/service.ts',{'@/lib/db/server':{getClient:async()=>client},'./route-distance':{}});
 await assert.rejects(service.recordWeeklyPayment(7,'2026-09-28','REF',1,3500),/changed/);
 await assert.rejects(service.recordWeeklyPayment(7,calc.weekStart(),'REF',1,4400),/week must close/);
 assert.equal(inserted,false);
});
test('Routing failures remain pending instead of being paid as zero distance',async()=>{
 const before=process.env.GOOGLE_ROUTES_API_KEY;const fetchBefore=global.fetch;
 try {
  delete process.env.GOOGLE_ROUTES_API_KEY;
  let writes=0;
  const route=load('lib/earnings/route-distance.ts',{'@/lib/db/server':{query:async sql=>{if(sql.startsWith('UPDATE'))writes++;return {rows:[{route_distance_meters:null,plat:-33.9,plng:18.4,dlat:-33.8,dlng:18.5}]};}}});
  assert.equal(await route.verifyRouteDistance(1),null);
  process.env.GOOGLE_ROUTES_API_KEY='test-only-key';global.fetch=async()=>({ok:true,json:async()=>({routes:[]})});
  assert.equal(await route.verifyRouteDistance(1),null);assert.equal(writes,0);
 }finally{if(before===undefined)delete process.env.GOOGLE_ROUTES_API_KEY;else process.env.GOOGLE_ROUTES_API_KEY=before;global.fetch=fetchBefore;}
});
