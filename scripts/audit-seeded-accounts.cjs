// Read-only. Run against the intended environment; never prints passwords/hashes.
require('@next/env').loadEnvConfig(process.cwd());
const {Client}=require('pg');
const fs=require('node:fs');
const seeds=['scripts/dev-seeds/seed_test_users.sql','scripts/dev-seeds/seed_test_customer.sql'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const emails=[...new Set(seeds.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])];
const hashes=[...new Set(seeds.match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g)||[])];
const db=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||5432,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,
  ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:true}:false});
(async()=>{try{
  await db.connect();
  const result=await db.query(`SELECT u.id,u.role,u.is_active,u.email_verified,
    (u.password_hash=ANY($2::text[]) OR EXISTS(SELECT 1 FROM auth_accounts a WHERE a.user_id=u.id AND a.password=ANY($2::text[]))) AS matches_known_seed_hash,
    (SELECT COUNT(*)::int FROM auth_sessions s WHERE s.user_id=u.id) AS sessions
    FROM users u WHERE u.email=ANY($1::text[]) OR u.password_hash=ANY($2::text[]) ORDER BY u.id`,[emails,hashes]);
  console.log(JSON.stringify({scope:'Configured database only; no hosted-environment assumption',accounts:result.rows},null,2));
}catch(error){console.error('Account audit failed:',error.code||error.name);process.exitCode=1;}finally{await db.end();}})();
