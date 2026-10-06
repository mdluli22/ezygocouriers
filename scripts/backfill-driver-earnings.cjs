// Dry run by default; --apply verifies historical pending routes. Never pays drivers.
require('@next/env').loadEnvConfig(process.cwd());
const {Pool}=require('pg');const {readFileSync}=require('node:fs');const {resolve,dirname}=require('node:path');const ts=require('typescript');
const pool=new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||5432,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:false}:false});
const db={query:(sql,args)=>pool.query(sql,args),getClient:()=>pool.connect()};
const cache=new Map();
function load(file){const filename=resolve(__dirname,'..',file);if(cache.has(filename))return cache.get(filename);const module={exports:{}};cache.set(filename,module.exports);const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',source)(name=>name==='@/lib/db/server'?db:name.startsWith('.')?load(resolve(dirname(filename),name+'.ts')):require(name),module,module.exports);return module.exports;}
(async()=>{try{
 const pending=await pool.query(`SELECT delivery_id,completed_at FROM driver_delivery_earnings WHERE amount_cents IS NULL AND distance_source IS DISTINCT FROM 'admin_verified' ORDER BY delivery_id`);
 console.log({pendingDeliveries:pending.rowCount,missingCompletionDate:pending.rows.filter(row=>!row.completed_at).length,apply:process.argv.includes('--apply')});
 if(!process.argv.includes('--apply'))return;
 const {refreshEarningDistance}=load('lib/earnings/service.ts');
 let calculated=0;
 for(const row of pending.rows){try{await refreshEarningDistance(row.delivery_id);calculated++;}catch(error){console.error('Backfill paused:',error.message);process.exitCode=1;break;}}
 console.log({routesVerified:calculated});
 console.log('Distances over 30 km and missing completion dates still require admin review.');
}catch(error){console.error('Backfill failed:',error.code||error.message);process.exitCode=1;}finally{await pool.end();}})();
