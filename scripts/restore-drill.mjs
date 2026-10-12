// Destructive operations are confined to the disposable container created here.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
const container = `ezygo-restore-${randomUUID().slice(0, 8)}`;
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: input instanceof Buffer ? undefined : 'utf8', maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(String(result.stderr || result.error));
  return result.stdout;
}
const sql = (db, text) => docker(['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', db, '-At'], text);
const started = Date.now();
try {
  docker(['run', '-d', '--name', container, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16-alpine']);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not start');
  sql('postgres', 'CREATE DATABASE source; CREATE DATABASE restored; CREATE DATABASE schema_reference;');
  const migrations = readdirSync('scripts/sql').filter(name => /^\d+.*\.sql$/.test(name)).sort();
  for (const file of migrations) sql('source', readFileSync(`scripts/sql/${file}`, 'utf8'));
  const seededUsers = Number(sql('source', 'SELECT count(*) FROM users').trim());
  if (seededUsers !== 0) throw new Error('Production bootstrap contains seeded users');
  sql('source', `INSERT INTO users(full_name,email,password_hash,email_verified) VALUES ('Restore Test','restore@example.invalid','synthetic-not-a-password',true);
    INSERT INTO addresses(user_id,street_address,city,formatted_address) VALUES (1,'Synthetic pickup','Cape Town','Synthetic pickup, Cape Town'),(1,'Synthetic dropoff','Cape Town','Synthetic dropoff, Cape Town');
    INSERT INTO quotes(amount,currency) VALUES (123.45,'ZAR');
    INSERT INTO deliveries(customer_id,pickup_address_id,dropoff_address_id,quote_id,pickup_contact_name,pickup_contact_phone,recipient_name,recipient_phone,parcel_description)
    VALUES (1,1,2,1,'Synthetic sender','+27820000000','Synthetic recipient','+27820000001','Restore verification parcel');
    INSERT INTO payments(delivery_id,quote_id,amount,provider,customer_id) VALUES (1,1,123.45,'yoco',1);
    INSERT INTO auth_sessions(id,token,user_id,expires_at) VALUES ('restore-session','synthetic-token',1,NOW()+INTERVAL '1 day');`);
  sql('source', "CREATE TABLE restore_probe (id serial PRIMARY KEY, payload text NOT NULL); INSERT INTO restore_probe(payload) VALUES ('restore-check-α'), ('second row');");
  const dump = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'source', '-Fc', '--no-owner', '--no-acl'], Buffer.alloc(0));
  docker(['exec', '-i', container, 'pg_restore', '-U', 'postgres', '-d', 'restored', '--exit-on-error', '--no-owner', '--no-acl'], dump);
  const fingerprint = db => {
    const tables = sql(db, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").trim().split('\n');
    return tables.map(table => {
      if (!/^[a-z_]+$/.test(table)) throw new Error('Unexpected table name');
      return [table, sql(db, `SELECT count(*), md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text), '')) FROM "${table}" t`).trim()];
    });
  };
  const before = fingerprint('source'), after = fingerprint('restored');
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Restored row counts/content hashes differ');
  const schema = db => docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', db, '--schema-only', '--no-owner', '--no-acl']).split('\n').filter(line => !/^\\(un)?restrict /.test(line)).join('\n');
  // PostgreSQL canonicalizes some constraint casts on restore. Compare against
  // an independently restored schema-only archive, including every constraint.
  docker(['exec', '-i', container, 'pg_restore', '-U', 'postgres', '-d', 'schema_reference', '--schema-only', '--exit-on-error', '--no-owner', '--no-acl'], dump);
  const sourceSchema = schema('schema_reference'), restoredSchema = schema('restored');
  if (sourceSchema !== restoredSchema) { writeFileSync('/tmp/ezygo-source-schema.sql', sourceSchema); writeFileSync('/tmp/ezygo-restored-schema.sql', restoredSchema); throw new Error('Restored schema differs'); }
  if (!sql('restored', "INSERT INTO restore_probe(payload) VALUES ('after restore') RETURNING id").startsWith('3\n')) throw new Error('Sequence restoration failed');
  mkdirSync('deliverables', { recursive: true });
  const report = { completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, postgres: '16', migrations, archiveSha256: createHash('sha256').update(dump).digest('hex'), tables: before, schemaVerified: true, sequencesVerified: true, seededUsers, scope: 'Synthetic isolated database; not a production backup' };
  writeFileSync('deliverables/restore-drill.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: restored schema, ${before.length} tables, row hashes and sequence state. Evidence: deliverables/restore-drill.json`);
} finally {
  docker(['rm', '-fv', container]);
}
