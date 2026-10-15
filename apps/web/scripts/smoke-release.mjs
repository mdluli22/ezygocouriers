import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const port = 3407;
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port), '-H', '127.0.0.1'], {
  env: { ...process.env, DB_HOST: '127.0.0.1', DB_PORT: '1', ENABLE_NOTIFICATION_WORKER: 'false', BETTER_AUTH_SECRET: 'smoke-only-secret-never-used-in-production', BETTER_AUTH_URL: `http://127.0.0.1:${port}` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', data => { output += data; });
server.stderr.on('data', data => { output += data; });
const request = path => fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
try {
  let started = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await request('/api/health/live')).ok) { started = true; break; } } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(started, 'release server started');
  for (const path of ['/', '/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']) assert.equal((await request(path)).status, 200, path);
  assert.equal((await request('/api/health/ready')).status, 503, 'readiness must fail with unreachable database');
  assert.equal((await request('/api/deliveries')).status, 401);
  assert.equal((await request('/api/admin/users')).status, 401);
  assert.equal((await request('/dashboard')).status, 307);
  console.log('PASS: release pages, anonymous authorization and database-outage readiness');
} finally { server.kill('SIGTERM'); }
