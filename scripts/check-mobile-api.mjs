// Non-destructive deployment check: no credentials, Google flows, or email sends.
// Empty POST bodies must fail validation before any auth action is performed.
const origin = new URL(process.argv[2] || 'https://ezygocouriers.co.za');
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Pass an HTTP(S) server origin without credentials or a path.');
}
const checks = [
  ['GET', '/api/mobile/v1/auth/session', 401, 'UNAUTHORIZED'],
  ['POST', '/api/mobile/v1/auth/login', 422, 'VALIDATION_ERROR'],
  ['POST', '/api/mobile/v1/auth/google', 422, 'VALIDATION_ERROR'],
];
let failed = false;
for (const [method, path, status, code] of checks) {
  try {
    const response = await fetch(new URL(path, origin), {
      method, headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: '{}' } : {}),
      redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(15000),
    });
    let body;
    try { body = await response.json(); } catch { /* HTML errors are reported below. */ }
    const ok = response.status === status && body?.success === false && body.code === code;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${method} ${path}: HTTP ${response.status}, ${body?.code ?? 'non-contract response'}`);
    if (!ok) failed = true;
  } catch {
    console.log(`FAIL ${method} ${path}: unable to reach the server`);
    failed = true;
  }
}
if (failed) {
  console.error('Mobile authentication is not ready on this server. Check the deployed app version, migrations, and proxy routes.');
  process.exitCode = 1;
}
