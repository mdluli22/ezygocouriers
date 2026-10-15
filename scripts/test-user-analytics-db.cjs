// Verify analytics in a disposable schema, never using real account/session data.
require('@next/env').loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');
const schema = 'analytics_test_' + randomUUID().replaceAll('-', '');
const pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}) } : false, connectionTimeoutMillis: 5000 });
(async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query(`CREATE TABLE users(id SERIAL PRIMARY KEY, role TEXT, is_active BOOLEAN DEFAULT TRUE, email_verified BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE auth_sessions(id TEXT PRIMARY KEY, user_id INT REFERENCES users(id), expires_at TIMESTAMPTZ);
      CREATE TABLE drivers(user_id INT REFERENCES users(id), status TEXT);`);
    const migration = readFileSync('scripts/sql/017_user_analytics.sql', 'utf8');
    await client.query(migration);
    await client.query(migration);
    await client.query(`INSERT INTO users(role, created_at, email_verified, is_active) VALUES
      ('customer', NOW(), TRUE, TRUE),
      ('customer', NOW() - INTERVAL '3 days', FALSE, TRUE),
      ('driver', NOW() - INTERVAL '20 days', TRUE, TRUE),
      ('admin', NOW() - INTERVAL '60 days', TRUE, FALSE);
      INSERT INTO drivers VALUES (3, 'active');
      INSERT INTO auth_sessions VALUES ('a', 1, NOW() + INTERVAL '1 day'), ('b', 1, NOW() + INTERVAL '1 day'),
        ('expired', 2, NOW() - INTERVAL '1 minute'), ('driver', 3, NOW() + INTERVAL '1 day'), ('disabled', 4, NOW() + INTERVAL '1 day');`);
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync('lib/services/analytics.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    let queue = Promise.resolve();
    const query = (...args) => { const result = queue.then(() => client.query(...args)); queue = result.catch(() => {}); return result; };
    new Function('require', 'module', 'exports', source)(() => ({ query }), module, module.exports);
    const { recordPresence, getUserAnalytics } = module.exports;
    await recordPresence('a', 2);
    assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM auth_session_presence')).rows[0].n, 0, 'wrong owner cannot write');
    for (const [session, user] of [['a', 1], ['b', 1], ['expired', 2], ['driver', 3], ['disabled', 4]]) await recordPresence(session, user);
    await client.query("UPDATE auth_session_presence SET last_seen_at = NOW() - INTERVAL '20 seconds' WHERE session_id = 'a'");
    await recordPresence('a', 1);
    assert.equal((await client.query("SELECT last_seen_at = NOW() - INTERVAL '20 seconds' AS unchanged FROM auth_session_presence WHERE session_id = 'a'")).rows[0].unchanged, true, 'frequent requests do not write again');
    await client.query("UPDATE auth_session_presence SET last_seen_at = NOW() - INTERVAL '1 minute' WHERE session_id = 'a'");
    await recordPresence('a', 1);
    assert.equal((await client.query("SELECT last_seen_at = NOW() AS renewed FROM auth_session_presence WHERE session_id = 'a'")).rows[0].renewed, true, 'minute heartbeat renews activity');
    let data = await getUserAnalytics();
    assert.equal(data.live, 2, 'distinct users, excluding expired sessions and disabled users');
    assert.equal(data.registered, 4);
    assert.equal(data.today, 1);
    assert.equal(data.last7Days, 2);
    assert.equal(data.last30Days, 3);
    assert.equal(data.verified, 3);
    assert.equal(data.unverified, 1);
    assert.equal(data.enabled, 3);
    assert.equal(data.trend.length, 14);
    assert.equal(data.trend.reduce((n, d) => n + d.count, 0), 2);
    await client.query("UPDATE drivers SET status = 'inactive'");
    assert.equal((await getUserAnalytics()).live, 1, 'inactive drivers do not remain online');
    await client.query("UPDATE auth_session_presence SET last_seen_at = NOW() - INTERVAL '3 minutes'");
    assert.equal((await getUserAnalytics()).live, 0, 'stale heartbeats expire');
    await client.query("DELETE FROM auth_sessions WHERE id = 'a'");
    assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM auth_session_presence WHERE session_id = 'a'")).rows[0].n, 0, 'logout removes session presence');
    await client.query('TRUNCATE auth_session_presence, auth_sessions, drivers, users CASCADE');
    data = await getUserAnalytics();
    assert.equal(data.registered, 0);
    assert.equal(data.live, 0);
    assert.equal(data.trend.length, 14);
    assert.ok(data.trend.every(day => day.count === 0));
    console.log('User analytics database checks passed (isolated schema rolled back).');
  } catch (error) { console.error('Analytics database test failed:', error.code || error.message); process.exitCode = 1; }
  finally { if (client) { await client.query('ROLLBACK'); client.release(); } await pool.end(); }
})();
