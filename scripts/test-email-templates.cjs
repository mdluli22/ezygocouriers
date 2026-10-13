const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const ts=require('typescript');
function loadTemplates(){const mod={exports:{}};new Function('exports','require','module',ts.transpileModule(readFileSync('lib/email/templates.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,require,mod);return mod.exports;}
const t=loadTemplates();
const data={customerName:'Amanda <script>alert(1)</script>',recipientName:'Tess & Co',trackingNumber:'EZY-123',deliveryId:42,pickupAddress:'123 Main Road',dropoffAddress:'456 Long Street',driverName:'Sipho',deliveredAt:'2026-10-12T17:29:00Z'};
test('Every email has accessible text, escaped fields, a shared frame and no executable content',()=>{
 const emails=[t.bookingEmail(data),t.driverAssignedEmail(data),t.completedEmail(data),t.deliveryPinEmail({...data,pin:'123456'}),t.passwordResetEmail('https://example.invalid/reset?token=abc&next=ok'),t.cancelledEmail(data),...['sign-in','email-verification','forget-password','change-email'].map(type=>t.authOtpEmail('123456',type))];
 for(const email of emails){assert.ok(email.subject);assert.ok(email.text.length>30);assert.match(email.html,/<!doctype html>/);assert.match(email.html,/lang="en"/);assert.match(email.html,/role="presentation"/);assert.match(email.html,/Moving what matters/);assert.doesNotMatch(email.html,/<script|<iframe|javascript:/i);assert.ok(Buffer.byteLength(email.html)<100000);}
 assert.match(emails[0].html,/Amanda &lt;script&gt;/);assert.match(emails[2].html,/Tess &amp; Co/);
 assert.match(emails[0].html,/dashboard\/tracking\/42/);assert.match(emails[0].html,/123 Main Road/);
 assert.match(emails[4].html,/token=abc&amp;next=ok/);
});
test('PIN and auth secrets stay out of preheaders and preserve expiry/security instructions',()=>{
 const pin=t.deliveryPinEmail({...data,pin:'724037'});
 assert.match(pin.html,/724037/);assert.match(pin.text,/physically with you/);
 assert.doesNotMatch(pin.html.match(/<div style="display:none[\s\S]*?<\/div>/)[0],/724037/);
 assert.match(t.authOtpEmail('123456','sign-in').text,/10 minutes/);
 assert.match(t.passwordResetEmail('https://example.invalid/reset').text,/30 minutes/);
 assert.throws(()=>t.passwordResetEmail('javascript:alert(1)'),/Invalid email action URL/);
});
test('Status emails use factual data without invented ETAs, ratings, or timestamps',()=>{
 const assigned=t.driverAssignedEmail(data);assert.match(assigned.text,/Sipho has been assigned/);assert.doesNotMatch(assigned.html,/5.?8 minutes|4\.9|App Store|Google Play/);
 const completed=t.completedEmail(data);assert.match(completed.text,/19:29/);assert.match(completed.text,/South Africa time/);
 assert.doesNotMatch(t.completedEmail({...data,deliveredAt:undefined}).html,/Delivered on/);
 assert.doesNotMatch(t.completedEmail({...data,deliveredAt:'invalid'}).html,/Invalid Date/);
});

test('Cancellation confirms status without claiming a refund and escapes customer data',()=>{
 const email=t.cancelledEmail(data);
 assert.match(email.subject,/Delivery cancelled/);
 assert.match(email.text,/not a refund/);
 assert.match(email.html,/Amanda &lt;script&gt;/);
 assert.match(email.html,/dashboard\/tracking\/42/);
 assert.doesNotMatch(email.html,/<script|refund has been issued/i);
});
