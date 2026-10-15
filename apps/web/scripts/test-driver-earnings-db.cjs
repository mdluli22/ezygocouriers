// SQL integration checks use session-local temporary tables only.
require('@next/env').loadEnvConfig(process.cwd());
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');const {resolve,dirname}=require('node:path');
const ts=require('typescript');const {Client}=require('pg');
function load(file,mocks={}){const filename=resolve(__dirname,'..',file);const module={exports:{}};const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',source)(name=>name in mocks?mocks[name]:name.startsWith('.')?load(resolve(dirname(filename),name+'.ts'),mocks):require(name),module,module.exports);return module.exports;}
const client=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||5432,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:false}:false});
(async()=>{try{
 await client.connect();await client.query('BEGIN');
 await client.query(`CREATE TEMP TABLE users(id integer PRIMARY KEY,full_name text);
 CREATE TEMP TABLE drivers(id integer PRIMARY KEY,user_id integer);
 CREATE TEMP TABLE deliveries(id integer PRIMARY KEY,tracking_number text);
 CREATE TEMP TABLE driver_delivery_earnings(delivery_id integer PRIMARY KEY,driver_id integer,completed_at timestamptz,distance_meters integer,amount_cents integer,rate_version text,distance_source text,approved_by integer,approval_note text,approved_at timestamptz);
 CREATE TEMP TABLE driver_weekly_payouts(id serial PRIMARY KEY,driver_id integer,week_start date,amount_cents bigint,delivery_count integer,paid_at timestamptz DEFAULT NOW(),recorded_by integer,reference text,UNIQUE(driver_id,week_start));
 CREATE TEMP TABLE driver_earning_audit(id serial,delivery_id integer,admin_id integer,previous_value jsonb,new_value jsonb,note text);
 INSERT INTO users VALUES(99,'Test Driver'),(100,'Other Driver');INSERT INTO drivers VALUES(7,99),(8,100);
 INSERT INTO deliveries VALUES(1,'TEST-1'),(2,'TEST-2'),(3,'TEST-3'),(4,'TEST-4');
 INSERT INTO driver_delivery_earnings(delivery_id,driver_id,completed_at,distance_meters,amount_cents) VALUES
 (1,7,'2020-01-05T21:59:59Z',8000,3500),(2,7,'2020-01-05T22:00:00Z',13000,3900),(3,8,'2020-01-01T12:00:00Z',4000,3200),(4,7,'2020-01-02T10:00:00Z',NULL,NULL);`);
 const query=(sql,args)=>client.query(sql==='BEGIN'?'SAVEPOINT service_tx':sql==='COMMIT'?'RELEASE SAVEPOINT service_tx':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT service_tx':sql,args);
 const service=load('lib/earnings/service.ts',{'@/lib/db/server':{query,getClient:async()=>({query,release(){}})},'./route-distance':{}});
 let report=await service.earningsReport('2019-12-30','2020-01',99);
 assert.equal(report.drivers.length,1);assert.equal(report.drivers[0].completedCount,2);assert.equal(report.drivers[0].totalCents,3500);assert.equal(report.drivers[0].pendingCount,1);
 await assert.rejects(service.recordWeeklyPayment(7,'2019-12-30','TEST REF',99,9200),/pending/);
 await service.approveEarning({deliveryId:4,meters:28000,note:'Verified test route'},99);
 report=await service.earningsReport('2019-12-30','2020-01',99);assert.equal(report.drivers[0].totalCents,9200);
 await service.recordWeeklyPayment(7,'2019-12-30','TEST REF',99,9200);
 report=await service.earningsReport('2019-12-30','2020-01',99);assert.equal(report.drivers[0].owedCents,0);assert.equal(report.drivers[0].paidCents,9200);
 await assert.rejects(service.recordWeeklyPayment(7,'2019-12-30','DUPLICATE',99,9200),/already/);
 await assert.rejects(service.approveEarning({deliveryId:4,meters:2000,note:'Must be rejected'},99),/locked/);
 const next=await service.earningsReport('2020-01-06','2020-01',99);assert.equal(next.drivers[0].totalCents,3900);
 await client.query('INSERT INTO deliveries VALUES(5,\'TEST-5\')');
 await service.recordCompletion({query},5,7,18000);await service.recordCompletion({query},5,8,4000);
 const snapshot=await client.query('SELECT * FROM driver_delivery_earnings WHERE delivery_id=5');assert.equal(snapshot.rowCount,1);assert.equal(snapshot.rows[0].driver_id,7);assert.equal(snapshot.rows[0].amount_cents,4400);
 console.log('Database integration passed: SAST cutoff, driver isolation, approvals, weekly totals, paid locking, idempotent completion.');
 }catch(e){console.error('Integration failed:',e.message);process.exitCode=1;}finally{await client.query('ROLLBACK').catch(()=>{});await client.end();}})();
