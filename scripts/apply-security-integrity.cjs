require('@next/env').loadEnvConfig(process.cwd());
const {Client}=require('pg');
const {readFileSync}=require('node:fs');
const client=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||5432,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,
  ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:true}:false});
(async()=>{try{await client.connect();await client.query(readFileSync('scripts/sql/013_security_payment_integrity.sql','utf8'));console.log('Security/payment integrity migration applied. No accounts disabled or external payments made.');}
catch(error){console.error('Migration failed:',error.code||error.name);process.exitCode=1;}finally{await client.end();}})();
