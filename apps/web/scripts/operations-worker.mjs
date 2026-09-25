const secret = process.env.OPERATIONS_WORKER_SECRET;
if (!secret) throw new Error('Set OPERATIONS_WORKER_SECRET before starting the operations worker.');
const origin = process.env.OPERATIONS_API_URL || 'http://localhost:3000';
while (true) {
  try {
    const response = await fetch(`${origin}/api/internal/operations`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(120000) });
    if (!response.ok) console.error('Operations worker request failed:', response.status);
  } catch { console.error('Operations worker unavailable; retrying.'); }
  await new Promise(resolve => setTimeout(resolve, 60000));
}
