// Generates synthetic, offline previews without sending mail or accessing a database.
const {readFileSync,writeFileSync,mkdirSync,copyFileSync}=require('node:fs');
const {resolve}=require('node:path');
const ts=require('typescript');
const compiled=ts.transpileModule(readFileSync('lib/email/templates.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleObject={exports:{}};
new Function('exports','require','module',compiled)(moduleObject.exports,require,moduleObject);
const templates=moduleObject.exports;
const data={customerName:'Amanda',recipientName:'Tess',trackingNumber:'EZY-DEMO814',deliveryId:814,pickupAddress:'123 Main Road, Sea Point, Cape Town',dropoffAddress:'456 Long Street, Cape Town City Centre',driverName:'Sipho M.',deliveredAt:'2026-10-12T17:29:00Z'};
const previews=[['Booking confirmation',templates.bookingEmail(data)],['Driver assigned',templates.driverAssignedEmail(data)],['Delivery PIN',templates.deliveryPinEmail({...data,pin:'724037'})],['Delivered successfully',templates.completedEmail(data)],['Verify email',templates.authOtpEmail('123456','email-verification')],['Sign in',templates.authOtpEmail('123456','sign-in')],['Change email',templates.authOtpEmail('123456','change-email')],['Password reset code',templates.authOtpEmail('123456','forget-password')],['Password reset link',templates.passwordResetEmail('https://example.invalid/auth/reset-password?token=preview-only')]];
const destination=resolve('out/email-preview');mkdirSync(destination,{recursive:true});
copyFileSync('public/images/email/courier.jpg',destination+'/courier.jpg');copyFileSync('public/navbar-logo.png',destination+'/logo.png');
let index='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EzyGo email designs</title><style>body{margin:0;padding:32px;background:#eef3f0;font:15px Arial;color:#163931}h1{font-size:32px}p{color:#52665e}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:24px}iframe{width:100%;height:1380px;border:1px solid #dce5df;border-radius:18px;background:white}h2{font-size:17px}</style><h1>EzyGo email designs</h1><p>Synthetic examples · Live text and buttons · No emails sent</p><div class="grid">';
previews.forEach(([title,email],i)=>{const name=`${i+1}.html`;const html=email.html.replace(/src="[^"]*\/images\/email\/courier.jpg"/g,'src="courier.jpg"').replace(/src="[^"]*\/navbar-logo.png"/g,'src="logo.png"');writeFileSync(destination+'/'+name,html);writeFileSync(destination+'/'+(i+1)+'.txt',email.text);index+=`<section><h2>${title}</h2><iframe title="${title}" src="${name}"></iframe></section>`;});
writeFileSync(destination+'/index.html',index+'</div></html>');console.log(destination+'/index.html');
