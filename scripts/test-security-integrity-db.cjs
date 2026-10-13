// Real PostgreSQL integration/concurrency tests in a disposable private schema.
// Customer tables and external providers are never modified or called.
require('@next/env').loadEnvConfig(process.cwd());
const assert=require('node:assert/strict');
const {readFileSync,readdirSync,existsSync}=require('node:fs');
process.env.NOTIFICATION_ENCRYPTION_KEY='test-only-outbox-encryption-key-at-least-32-characters';
delete process.env.VAPID_PUBLIC_KEY;delete process.env.VAPID_PRIVATE_KEY;
const {resolve,dirname,extname}=require('node:path');
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const ts=require('typescript');
const schema='audit_integrity_'+randomUUID().replaceAll('-','');
const config={host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||5432,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:true}:false};
const setup=new Pool(config),pool=new Pool({...config,options:`-c search_path=${schema},public -c statement_timeout=15000`,max:8});
let sent=0,bookingSent=0,assignedSent=0,failMail=false;
const mocks={
 '@/lib/db/server':{query:(...args)=>pool.query(...args),getClient:()=>pool.connect()},
 '@/lib/email/smtp':{sendDeliveryPin:async()=>{if(failMail)throw Error('synthetic SMTP outage');sent++;},sendBookingConfirmation:async()=>{bookingSent++;},sendDriverAssigned:async()=>{assignedSent++;},sendDeliveryCompleted:async()=>{sent++;}},
 '@/lib/earnings/route-distance':{verifyRouteDistance:async()=>5464},
 './driver-assignment':{autoAssignDelivery:async()=>{},autoAssignNextPaidDeliveryToDriver:async()=>null},
};
const cache=new Map();
function load(file){
 const filename=resolve(file);if(cache.has(filename))return cache.get(filename).exports;
 const module={exports:{}};cache.set(filename,module);
 const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 function req(name){if(name in mocks)return mocks[name];if(name==='@ezygo/contracts')return load('packages/contracts/src/index.ts');if(name.startsWith('@ezygo/contracts/'))return load('packages/contracts/src/'+name.slice('@ezygo/contracts/'.length)+'.ts');if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.')){const p=resolve(dirname(filename),name);return load(extname(p)?p:existsSync(p+'.ts')?p+'.ts':p+'/index.ts');}return require(name);}
 new Function('require','module','exports',source)(req,module,module.exports);return module.exports;
}
const q=(...args)=>pool.query(...args);
async function state(id){return (await q('SELECT status FROM deliveries WHERE id=$1',[id])).rows[0].status;}
(async()=>{try{
 await setup.query(`CREATE SCHEMA ${schema}`);
 for(const file of readdirSync('scripts/sql').filter(f=>/^\d.*\.sql$/.test(f)).sort())await q(readFileSync('scripts/sql/'+file,'utf8'));
 // Applying the new migration twice must be safe.
 await q(readFileSync('scripts/sql/013_security_payment_integrity.sql','utf8'));
 await q(readFileSync('scripts/sql/015_delivery_email_templates.sql','utf8'));
 await q(readFileSync('scripts/sql/015_delivery_email_templates.sql','utf8'));
 assert.equal((await q('SELECT COUNT(*)::int n FROM users')).rows[0].n,0,'production bootstrap contains no seeded accounts');
 const customer=(await q("INSERT INTO users(full_name,email,password_hash,role,is_active,email_verified) VALUES ('Test Customer','audit-customer@example.invalid','test','customer',true,true) RETURNING id")).rows[0].id;
 const driverUser=(await q("INSERT INTO users(full_name,email,password_hash,role,is_active,email_verified) VALUES ('Test Driver','audit-driver@example.invalid','test','driver',true,true) RETURNING id")).rows[0].id;
 const admin=(await q("INSERT INTO users(full_name,email,password_hash,role,is_active,email_verified) VALUES ('Test Admin','audit-admin@example.invalid','test','admin',true,true) RETURNING id")).rows[0].id;
 const driver=(await q("INSERT INTO drivers(user_id,vehicle_type,vehicle_reg,license_number,status) VALUES ($1,'bike','TEST','TEST','active') RETURNING id",[driverUser])).rows[0].id;
 const deliveries=load('lib/services/deliveries.ts'),payments=load('lib/services/payments.ts'),admins=load('lib/services/admin.ts'),outbox=load('lib/services/notification-outbox.ts');
 const base={pickup_address:{formatted_address:'Company Gardens, Cape Town',city:'Cape Town',latitude:-33.9289,longitude:18.4175},dropoff_address:{formatted_address:'Waterfront, Cape Town',city:'Cape Town',latitude:-33.9036,longitude:18.4200},pickup_contact_name:'Test Customer',pickup_contact_phone:'+27821234567',recipient_name:'Test Recipient',recipient_phone:'+27821234568',recipient_email:'recipient@example.invalid',parcel_description:'Test parcel',require_pin:true};
 async function book(){const d=await deliveries.createDelivery(customer,base,randomUUID());await deliveries.confirmDelivery(d.id,customer);return d;}
 async function payment(d){return payments.createPaymentRecord({deliveryId:d.id,quoteId:d.quote.id,customerId:customer,amount:d.quote.amount,currency:d.quote.currency,provider:'yoco'});}
 const key=randomUUID(),same=await Promise.all([deliveries.createDelivery(customer,base,key),deliveries.createDelivery(customer,base,key)]);
 assert.equal(same[0].id,same[1].id);assert.equal((await q('SELECT COUNT(*)::int n FROM quotes')).rows[0].n,1);
 await assert.rejects(deliveries.createDelivery(customer,{...base,parcel_description:'Changed'},key),/different details/);
 console.log('PASS concurrent booking retries, payload conflict and one quote');
 await assert.rejects(admins.assignDriver(same[0].id,driver,admin),/paid/);
 await Promise.allSettled([deliveries.confirmDelivery(same[0].id,customer),deliveries.cancelCustomerDelivery(same[0].id,customer)]);
 assert.equal(await state(same[0].id),'cancelled');
 await assert.rejects(deliveries.confirmDelivery(same[0].id,customer),/Cannot confirm/);
 console.log('PASS unpaid assignment and confirm/cancel race');
 const d=await book(),pid=await payment(d);assert.equal(await payment(d),pid);
 await q("UPDATE payments SET provider_checkout_id='original-checkout' WHERE id=$1",[pid]);await payment(d);
 assert.equal((await q('SELECT provider_checkout_id FROM payments WHERE id=$1',[pid])).rows[0].provider_checkout_id,'original-checkout');
 const legacy=await book();const legacyId=await payment(legacy);await q("UPDATE payments SET provider='payfast',provider_checkout_id='legacy-mapping' WHERE id=$1",[legacyId]);
 const replacement=await payment(legacy);assert.notEqual(replacement,legacyId);
 assert.equal((await q('SELECT provider_checkout_id FROM payments WHERE id=$1',[legacyId])).rows[0].provider_checkout_id,'legacy-mapping');
 const completed={paymentId:pid,deliveryId:d.id,provider:'yoco',providerPaymentId:'provider-one'};
 await Promise.all([payments.completePayment(completed),payments.completePayment(completed)]);
 assert.equal(await state(d.id),'paid');assert.equal((await q("SELECT COUNT(*)::int n FROM notification_outbox WHERE kind='pin_email'")).rows[0].n,1);
 assert.equal((await q("SELECT COUNT(*)::int n FROM notification_outbox WHERE kind='booking_email'")).rows[0].n,1,'duplicate payment queues one booking email');
 const secret=(await q('SELECT delivery_pin_hash FROM deliveries WHERE id=$1',[d.id])).rows[0].delivery_pin_hash;
 await payments.completePayment(completed);assert.equal((await q('SELECT delivery_pin_hash FROM deliveries WHERE id=$1',[d.id])).rows[0].delivery_pin_hash,secret);
 await q("UPDATE deliveries SET status='confirmed' WHERE id=$1",[d.id]);await payments.completePayment(completed);assert.equal(await state(d.id),'paid');
 const encrypted=(await q("SELECT encrypted_payload FROM notification_outbox WHERE kind='pin_email'")).rows[0].encrypted_payload;assert.ok(!encrypted.includes('recipient@'));
 failMail=true;await outbox.processNotificationOutbox();assert.equal((await q("SELECT status FROM notification_outbox WHERE kind='pin_email'")).rows[0].status,'pending');
 failMail=false;await q("UPDATE notification_outbox SET available_at=NOW()");await outbox.processNotificationOutbox();assert.equal(sent,1);assert.equal(bookingSent,1);
 assert.equal((await q("SELECT encrypted_payload FROM notification_outbox WHERE kind='pin_email'")).rows[0].encrypted_payload,null);
 console.log('PASS duplicate payment, stable encrypted PIN, SMTP retry and payload erasure');
 await q("UPDATE drivers SET status='inactive' WHERE id=$1",[driver]);await assert.rejects(admins.assignDriver(d.id,driver,admin),/inactive/);
 assert.equal(await load('lib/security/driver-access.ts').driverIsActive(driverUser),false);
 await q("UPDATE drivers SET status='active' WHERE id=$1",[driver]);await admins.assignDriver(d.id,driver,admin);
 await admins.assignDriver(d.id,driver,admin);
 assert.equal((await q("SELECT COUNT(*)::int n FROM notification_outbox WHERE kind='assigned_email'")).rows[0].n,1);
 await outbox.processNotificationOutbox();assert.equal(assignedSent,1);
 const driverDetail=await load('lib/services/drivers.ts').getDriverDeliveryById(d.id,driverUser);assert.equal('delivery_pin_hash' in driverDetail,false);
 const customerDetail=await deliveries.getDeliveryById(d.id,customer);assert.equal('delivery_pin_hash' in customerDetail,false);
 const d2=await book(),pid2=await payment(d2);await payments.completePayment({paymentId:pid2,deliveryId:d2.id,provider:'yoco',providerPaymentId:'provider-two'});
 await assert.rejects(admins.assignDriver(d2.id,driver,admin),/active delivery/);
 await q("UPDATE deliveries SET status='in_transit' WHERE id=$1",[d.id]);await assert.rejects(admins.assignDriver(d.id,driver,admin),/awaiting pickup/);
 await q("UPDATE drivers SET status='inactive' WHERE id=$1",[driver]);await assert.rejects(load('lib/services/drivers.ts').updateDeliveryStatus(d.id,driverUser,'failed'),/not assigned/);
 console.log('PASS inactive/busy driver protections, transition guard and secret-free responses');
 const late=await book(),lateId=await payment(late);await deliveries.cancelCustomerDelivery(late.id,customer);
 const lateParams={paymentId:lateId,deliveryId:late.id,provider:'yoco',providerPaymentId:'provider-late'};
 await payments.completePayment(lateParams);await payments.completePayment(lateParams);assert.equal(await state(late.id),'cancelled');
 assert.equal((await q('SELECT COUNT(*)::int n FROM payment_reviews WHERE delivery_id=$1',[late.id])).rows[0].n,1);
 await deliveries.cancelCustomerDelivery(d2.id,customer);assert.equal((await q('SELECT COUNT(*)::int n FROM payment_reviews WHERE delivery_id=$1',[d2.id])).rows[0].n,1);
 const reviews=load('lib/services/payment-reviews.ts'),review=(await q('SELECT id FROM payment_reviews WHERE delivery_id=$1',[late.id])).rows[0].id;
 await assert.rejects(reviews.resolvePaymentReview(review,admin,'refunded','Refunded in provider dashboard'),/reference/);
 await reviews.resolvePaymentReview(review,admin,'refunded','Refunded in provider dashboard','test-refund-reference');
 await assert.rejects(reviews.resolvePaymentReview(review,admin,'resolved','Must not overwrite resolution'),/already resolved/);
 assert.equal((await q('SELECT COUNT(*)::int n FROM payment_review_audit')).rows[0].n,1);
 console.log('PASS late payments, paid cancellation, refund reference and immutable audit');
 const raced=await book(),raceId=await payment(raced);
 await Promise.all([payments.completePayment({paymentId:raceId,deliveryId:raced.id,provider:'yoco',providerPaymentId:'provider-race'}),deliveries.cancelCustomerDelivery(raced.id,customer)]);
 assert.equal(await state(raced.id),'cancelled');assert.equal((await q('SELECT COUNT(*)::int n FROM payment_reviews WHERE delivery_id=$1',[raced.id])).rows[0].n,1);
 const beforeQuotes=(await q('SELECT COUNT(*)::int n FROM quotes')).rows[0].n;
 await assert.rejects(deliveries.createDelivery(customer,{...base,recipient_name:null},randomUUID()));
 assert.equal((await q('SELECT COUNT(*)::int n FROM quotes')).rows[0].n,beforeQuotes,'failed delivery rolls back quote');
 const expired=await deliveries.createDelivery(customer,base,randomUUID());await q("UPDATE quotes SET expires_at=NOW()-INTERVAL '1 hour' WHERE id=$1",[expired.quote.id]);
 await assert.rejects(deliveries.confirmDelivery(expired.id,customer),/expired/);assert.equal(await state(expired.id),'quoted');
 console.log('PASS payment/cancellation race, atomic quote rollback and expired quote rejection');
 await assert.rejects(outbox.recoverRecipientPin(d.id,customer+10000,false),/not found/);
 await q("UPDATE drivers SET status='active' WHERE id=$1",[driver]);
 await q("UPDATE deliveries SET status='in_transit' WHERE id=$1",[d.id]);
 const beforeResend=(await q('SELECT delivery_pin_hash FROM deliveries WHERE id=$1',[d.id])).rows[0].delivery_pin_hash;
 await outbox.recoverRecipientPin(d.id,customer,false);
 const afterResend=(await q('SELECT delivery_pin_hash FROM deliveries WHERE id=$1',[d.id])).rows[0].delivery_pin_hash;
 assert.notEqual(beforeResend,afterResend);assert.equal((await q("SELECT COUNT(*)::int n FROM notification_outbox WHERE delivery_id=$1 AND kind='pin_email' AND status='pending'",[d.id])).rows[0].n,1);
 console.log('PASS owned PIN recovery rotates once and denies other customers');
 const limiter=load('lib/security/rate-limit.ts'),attempts=await Promise.allSettled(Array.from({length:12},()=>limiter.consumeRateLimit('concurrent-test',10,60)));
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,10);assert.equal(attempts.filter(r=>r.status==='rejected').length,2);
 console.log('PASS shared rate limit under concurrent requests');
 console.log('All security/payment database checks passed. No customer records or external providers were touched.');
}catch(error){console.error(error);process.exitCode=1;}finally{
 await pool.end();await setup.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await setup.end();
}})();
