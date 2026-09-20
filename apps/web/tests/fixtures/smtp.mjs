export const sent = [];
export const isSmtpConfigured = () => true;
export const isRecipientRejected = () => false;
export async function verifySmtpConnection() {}
export async function sendAuthOtp(message) { sent.push({ kind: 'otp', ...message }); }
export async function sendDeliveryPin(message) { sent.push({ kind: 'pin', ...message }); }
export async function sendDeliveryCompleted(message) { sent.push({ kind: 'complete', ...message }); }
export async function captureSmtpDelivery(fn) { return { result: await fn(), failure: null }; }
