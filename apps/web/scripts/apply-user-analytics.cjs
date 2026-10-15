// Apply only the additive presence table and registration index.
require('@next/env').loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}) } : false, connectionTimeoutMillis: 5000 });
(async () => { try { await pool.query(readFileSync('scripts/sql/017_user_analytics.sql', 'utf8')); console.log('User analytics migration applied.'); } catch (error) { console.error('Migration failed:', error.code); process.exitCode = 1; } finally { await pool.end(); } })();
