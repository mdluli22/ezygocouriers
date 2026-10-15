// Apply only the additive rider earnings migration. Never prints credentials.
require('@next/env').loadEnvConfig(process.cwd());
const {Pool}=require('pg');const fs=require('node:fs');
const pool=new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||5432,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:false}:false});
(async()=>{try{await pool.query(fs.readFileSync('scripts/sql/012_driver_earnings.sql','utf8'));console.log('Rider earnings migration applied.');}catch(e){console.error('Migration failed:',e.code);process.exitCode=1;}finally{await pool.end();}})();
