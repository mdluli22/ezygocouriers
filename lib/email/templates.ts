/** Table-based, inline-styled transactional mail. No scripts, remote fonts or CSS-dependent layout. */
export interface EmailContent { subject: string; text: string; html: string }
export interface DeliveryEmailData {
  trackingNumber: string;
  customerName: string;
  recipientName?: string;
  deliveryId?: number;
  pickupAddress?: string;
  dropoffAddress?: string;
  driverName?: string;
  deliveredAt?: string;
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
function origin() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ezygocouriers.co.za');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid email app URL');
  return url.origin;
}
function link(path: string) { return `${origin()}${path}`; }
function button(label: string, url: string, secondary = false) {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid email action URL');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0"><tr><td align="center" bgcolor="${secondary ? '#ffffff' : '#005b46'}" style="border:1px solid #005b46;border-radius:24px"><a href="${escapeHtml(url)}" style="display:block;padding:15px 20px;color:${secondary ? '#005b46' : '#ffffff'};font-size:15px;font-weight:700;text-decoration:none;border-radius:24px">${escapeHtml(label)} &nbsp; &#8594;</a></td></tr></table>`;
}
function paragraph(text: string) { return `<p style="margin:16px 0;color:#243a43;font-size:15px;line-height:1.7">${text}</p>`; }
function heading(label: string, title: string) {
  return `<p style="margin:0 0 18px"><span style="display:inline-block;padding:8px 12px;border-radius:20px;background:#ddf8e9;color:#00633e;font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase">${escapeHtml(label)}</span></p><h1 style="margin:0 0 18px;color:#102e36;font-size:32px;line-height:1.15;letter-spacing:-.8px">${escapeHtml(title)}</h1>`;
}
function card(content: string, background = '#f2f6f4') {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0"><tr><td bgcolor="${background}" style="padding:20px;border-radius:14px">${content}</td></tr></table>`;
}
function row(label: string, value: string) { return `<p style="margin:0 0 5px;font-size:12px;color:#52616e">${escapeHtml(label)}</p><p style="margin:0;font-size:16px;line-height:1.5;font-weight:700;color:#102e36;overflow-wrap:anywhere">${escapeHtml(value)}</p>`; }
function tracking(number: string) { return card(row('Tracking number', number)); }
function codeBlock(code: string) {
  return card(`<p style="margin:0;text-align:center;font-family:Arial,sans-serif;font-size:34px;line-height:1.4;letter-spacing:8px;font-weight:800;color:#101c30">${escapeHtml(code)}</p>`);
}
function notice(title: string, text: string) {
  return card(`<p style="margin:0 0 8px;color:#005b46;font-size:15px;font-weight:700">${escapeHtml(title)}</p><p style="margin:0;font-size:14px;line-height:1.65;color:#38545a">${escapeHtml(text)}</p>`, '#e7f5ee');
}
function hero() {
  return `<img src="${escapeHtml(link('/images/email/courier.jpg'))}" alt="EzyGo courier illustration with Cape Town's Table Mountain" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:14px;margin:0 0 24px" />`;
}
function frame(preheader: string, content: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>EzyGo Couriers</title></head><body style="margin:0;padding:0;background:#f1f4f5;font-family:Arial,Helvetica,sans-serif;color:#102e36"><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f1f4f5"><tr><td align="center" style="padding:24px 12px"><!--[if mso]><table role="presentation" width="600"><tr><td><![endif]--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width:600px;border-radius:20px;border:1px solid #e8edef"><tr><td style="padding:28px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td><a href="${escapeHtml(link('/'))}" style="text-decoration:none;color:#102e36"><img src="${escapeHtml(link('/navbar-logo.png'))}" alt="GO" width="58" style="display:inline-block;border:0;vertical-align:middle;width:58px;height:auto"> <strong style="font-size:25px;vertical-align:middle">EzyGo</strong></a><p style="margin:4px 0 0 65px;font-size:8px;letter-spacing:3px;color:#006747">COURIERS</p></td><td align="right" style="font-size:8px;line-height:1.8;letter-spacing:2px;color:#53616f">FAST. SECURE.<br>LOCALLY YOURS.</td></tr></table></td></tr><tr><td style="padding:8px 24px 18px">${content}</td></tr><tr><td style="padding:0 12px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="#eaf5ef" style="padding:24px 16px;border-radius:12px;font-size:12px;line-height:1.8;color:#425d65">Thank you for choosing EzyGo Couriers.<br>Moving what matters, across Cape Town.<br><a href="${escapeHtml(link('/legal/aboutus'))}" style="color:#005b46">About EzyGo</a> &nbsp;&middot;&nbsp; <a href="${escapeHtml(link('/legal/privacy-policy'))}" style="color:#005b46">Privacy</a></td></tr></table></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}
function route(data: DeliveryEmailData) {
  return [data.pickupAddress && card(row('From',data.pickupAddress)),data.dropoffAddress && card(row('To',data.dropoffAddress))].filter(Boolean).join('');
}
function trackingUrl(data: DeliveryEmailData) {
  return link(data.deliveryId ? `/dashboard/tracking/${data.deliveryId}` : "/dashboard");
}
function timeline(assigned: boolean) {
  const steps=['Booking confirmed','Driver assigned','Picked up','In transit','Delivered'];
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0">${steps.map((step,index)=>`<tr><td width="30" style="padding:7px 0;color:${index<=(assigned?1:0)?'#008b58':'#81918f'};font-size:18px">${index<=(assigned?1:0)?'&#10003;':'&#9675;'}</td><td style="padding:7px 0;font-size:13px;color:#34464f">${step}</td></tr>`).join('')}</table>`;
}
export function bookingEmail(data: DeliveryEmailData): EmailContent {
  const subject=`Your delivery is booked: ${data.trackingNumber}`;
  const url=trackingUrl(data);
  return {subject,text:`Hi ${data.customerName},\nYour delivery ${data.trackingNumber} is booked and payment is confirmed. We'll let you know when a driver is assigned.\n${data.pickupAddress ? `From: ${data.pickupAddress}\n` : ''}${data.dropoffAddress ? `To: ${data.dropoffAddress}\n` : ''}Track your delivery: ${url}`,html:frame(subject,heading('Booking confirmed','Your delivery is booked!')+paragraph(`Hi ${escapeHtml(data.customerName)}, we’ve received your booking and payment. We’ll let you know when a driver is assigned.`)+hero()+tracking(data.trackingNumber)+timeline(false)+route(data)+button('Track your delivery',url))};
}
export function driverAssignedEmail(data: DeliveryEmailData): EmailContent {
  const subject=`Meet your EzyGo driver: ${data.trackingNumber}`;
  const url=trackingUrl(data);
  return {subject,text:`Hi ${data.customerName},\n${data.driverName || 'An EzyGo driver'} has been assigned to delivery ${data.trackingNumber}. We'll update you when your parcel is picked up.\nTrack your delivery: ${url}`,html:frame(subject,heading('Driver assigned','Meet your EzyGo driver.')+paragraph(`Hi ${escapeHtml(data.customerName)}, your delivery has a driver. Follow its progress from pickup to handover.`)+hero()+tracking(data.trackingNumber)+timeline(true)+card(row('Your EzyGo driver',data.driverName || 'EzyGo driver'),'#e7f5ee')+button('View delivery updates',url)+paragraph('We’ll let you know as soon as your parcel is picked up.'))};
}
export function deliveryPinEmail(data: {recipientName:string;trackingNumber:string;pin:string}): EmailContent {
  const subject=`${data.pin} is your EzyGo delivery PIN`;
  const warning='Only share this PIN once the parcel is physically with you. EzyGo staff will never ask for it before delivery.';
  return {subject,text:`Hi ${data.recipientName},\nYour delivery PIN for ${data.trackingNumber} is ${data.pin}.\n${warning}`,html:frame('Your secure handover code is inside.',heading('EzyGo secure handover','Your parcel is protected by a PIN.')+paragraph(`Hi ${escapeHtml(data.recipientName)}, use this code when your EzyGo driver hands over delivery <strong>${escapeHtml(data.trackingNumber)}</strong>.`)+codeBlock(data.pin)+notice('Keep your delivery secure',warning)+tracking(data.trackingNumber))};
}
export function completedEmail(data: DeliveryEmailData): EmailContent {
  const subject=`Delivered successfully: ${data.trackingNumber}`;
  const url=trackingUrl(data);
  const date=data.deliveredAt ? new Date(data.deliveredAt) : null;
  const deliveredAt=date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(date) : null;
  return {subject,text:`Hi ${data.customerName},\nYour EzyGo delivery ${data.trackingNumber} has been handed over successfully to ${data.recipientName || 'the recipient'}.${deliveredAt ? `\nDelivered on ${deliveredAt} (South Africa time).` : ''}\nDelivery details: ${url}\nBook another delivery: ${link('/dashboard/deliveries/new')}`,html:frame(subject,heading('Delivered successfully','Your delivery has arrived!')+`<p style="margin:12px 0;font-size:56px;line-height:1;color:#008b58" aria-hidden="true">&#10004;</p>`+paragraph(`Hi ${escapeHtml(data.customerName)}, your EzyGo delivery <strong>${escapeHtml(data.trackingNumber)}</strong> has been handed over successfully to <strong>${escapeHtml(data.recipientName || 'the recipient')}</strong>.`)+tracking(data.trackingNumber)+card(row('Delivered to',data.recipientName || 'The recipient')+(deliveredAt ? `<hr style="border:0;border-top:1px solid #dde6e2;margin:16px 0">${row('Delivered on · South Africa time',deliveredAt)}`:'')+`<hr style="border:0;border-top:1px solid #dde6e2;margin:16px 0">${row('Status','Delivered')}`)+button('View delivery details',url)+button('Book a new delivery',link('/dashboard/deliveries/new'),true))};
}
export function cancelledEmail(data: DeliveryEmailData): EmailContent {
  const subject = `Delivery cancelled: ${data.trackingNumber}`;
  const url = trackingUrl(data);
  const paymentNote = 'If a payment was collected, you can check its review status in your delivery details. This email confirms cancellation only, not a refund.';
  return {
    subject,
    text: `Hi ${data.customerName},\nYour EzyGo delivery ${data.trackingNumber} has been cancelled.\n${paymentNote}\nDelivery details: ${url}`,
    html: frame(subject, heading('Delivery cancelled', 'Your delivery has been cancelled.') +
      paragraph(`Hi ${escapeHtml(data.customerName)}, your EzyGo delivery <strong>${escapeHtml(data.trackingNumber)}</strong> has been cancelled.`) +
      tracking(data.trackingNumber) + route(data) + notice('Payment information', paymentNote) + button('View delivery details', url)),
  };
}
export function authOtpEmail(otp: string, type: 'sign-in'|'email-verification'|'forget-password'|'change-email'): EmailContent {
  const copy={ 'sign-in':['Secure sign-in','Your sign-in code.','sign in'], 'email-verification':['Welcome to EzyGo','Let’s verify your email.','verify your email address'], 'forget-password':['Account security','Reset your password.','reset your password'], 'change-email':['Account security','Confirm your new email.','confirm your new email address'] }[type];
  const subject=`${otp} is your EzyGo verification code`;
  const warning='This code expires in 10 minutes. If you did not request it, you can ignore this email.';
  return {subject,text:`Use this code to ${copy[2]}: ${otp}\n${warning}`,html:frame('Your EzyGo verification code expires in 10 minutes.',heading(copy[0],copy[1])+paragraph(`Use the code below to ${copy[2]}.`)+codeBlock(otp)+notice('For your security',warning))};
}
export function passwordResetEmail(url: string): EmailContent {
  const subject='Reset your EzyGo password';
  const warning='This single-use link expires in 30 minutes. If you did not request a password reset, ignore this email. Your password will stay the same.';
  return {subject,text:`Reset your password: ${url}\n${warning}`,html:frame('A secure link to reset your EzyGo password.',heading('Account security','A fresh start for your password.')+paragraph('We received a request to reset your EzyGo password. Choose a new password using the secure link below.')+button('Reset my password',url)+notice('Didn’t request this?',warning)+paragraph(`If the button doesn’t work, copy this link into your browser:<br><a href="${escapeHtml(url)}" style="color:#005b46;word-break:break-all">${escapeHtml(url)}</a>`))};
}
