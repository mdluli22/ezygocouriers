// Interactive rotation for known development credentials only. No password arguments/logs.
require('@next/env').loadEnvConfig(process.cwd());
const {Client}=require('pg');
const {readFileSync}=require('node:fs');
const {Writable}=require('node:stream');
const readline=require('node:readline/promises');
const bcrypt=require('bcryptjs');
const userId=Number(process.argv[2]);
if(!Number.isSafeInteger(userId)||userId<1||!process.stdin.isTTY){console.error('Run interactively: node scripts/rotate-seeded-password.cjs USER_ID');process.exit(1);}
const seeds=['scripts/dev-seeds/seed_test_users.sql','scripts/dev-seeds/seed_test_customer.sql'].map(p=>readFileSync(p,'utf8')).join('\n');
const known=[...new Set(seeds.match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g)||[])];
const muted=new Writable({write(_chunk,_encoding,done){done();}});
const prompt=readline.createInterface({input:process.stdin,output:muted,terminal:true});
const db=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||5432,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:true}:false});
let connected=false;
(async()=>{try{
 process.stdout.write('New unique password (hidden): ');const password=await prompt.question('');
 process.stdout.write('\nConfirm password (hidden): ');const confirmation=await prompt.question('');process.stdout.write('\n');prompt.close();
 if(password!==confirmation||password.length<14||Buffer.byteLength(password)>72)throw Error('Use matching passwords of at least 14 characters and at most 72 UTF-8 bytes.');
 await db.connect();connected=true;await db.query('BEGIN');
 const account=await db.query("SELECT a.id,a.password FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE u.id=$1 AND a.provider_id='credential' FOR UPDATE OF a,u",[userId]);
 if(account.rows.length!==1||!known.includes(account.rows[0].password))throw Error('This account does not have a known seed credential; no change made.');
 const hash=await bcrypt.hash(password,12);
 await db.query('UPDATE auth_accounts SET password=$2,updated_at=NOW() WHERE id=$1',[account.rows[0].id,hash]);
 await db.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE id=$1',[userId,hash]);
 await db.query('DELETE FROM auth_sessions WHERE user_id=$1',[userId]);await db.query('COMMIT');
 console.log(`Password rotated and sessions revoked for account ${userId}.`);
}catch(error){if(connected)await db.query('ROLLBACK').catch(()=>{});console.error(error.message);process.exitCode=1;}finally{prompt.close();await db.end().catch(()=>{});}})();
