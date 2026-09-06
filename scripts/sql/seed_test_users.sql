-- =============================================================================
-- TEST SEED: Admin, driver & customer accounts for development / testing
-- =============================================================================
-- Admin  → admin@ezygo.co.za   / Admin@1234
-- Driver → driver@ezygo.co.za  / Driver@1234
-- Customer → customer@ezygo.co.za / Customer@1234
--
-- Run via:
--   docker exec -i ezygo_db psql -U $DB_USER -d $DB_NAME < scripts/sql/seed_test_users.sql
-- =============================================================================

-- ── Fix the placeholder admin hash from 001_initial_schema.sql ──────────────
UPDATE users
SET password_hash = '$2b$12$lw8DkefXL92L1hv3lXu6q.JuUIxSpFonlFM9jsf2jlHmjEkMVle2q'
WHERE email = 'admin@ezygo.co.za';

-- ── Upsert test admin (idempotent) ───────────────────────────────────────────
INSERT INTO users (full_name, email, phone, password_hash, auth_provider, role, is_active, email_verified)
VALUES (
  'EzyGo Admin',
  'admin@ezygo.co.za',
  '+27600000001',
  '$2b$12$lw8DkefXL92L1hv3lXu6q.JuUIxSpFonlFM9jsf2jlHmjEkMVle2q',
  'email',
  'admin',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE
  SET password_hash  = EXCLUDED.password_hash,
      full_name      = EXCLUDED.full_name,
      is_active      = TRUE,
      email_verified = TRUE;

-- ── Upsert test customer ──────────────────────────────────────────────────────
INSERT INTO users (full_name, email, phone, password_hash, auth_provider, role, is_active, email_verified)
VALUES (
  'Test Customer',
  'customer@ezygo.co.za',
  '+27600000003',
  '$2b$12$y.FN8MpCDJaHW86AMCHwzejVjK.MNMEcmvO5mKqh3Za5DdSlC9A7u',
  'email',
  'customer',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE
  SET password_hash  = EXCLUDED.password_hash,
      full_name      = EXCLUDED.full_name,
      phone          = EXCLUDED.phone,
      auth_provider  = 'email',
      role           = 'customer',
      is_active      = TRUE,
      email_verified = TRUE,
      updated_at     = NOW();

-- ── Upsert test driver user ───────────────────────────────────────────────────
INSERT INTO users (full_name, email, phone, password_hash, auth_provider, role, is_active, email_verified)
VALUES (
  'Test Driver',
  'driver@ezygo.co.za',
  '+27600000002',
  '$2b$12$CU7Q50obsXLt5PZpMzzX6.ltNQGp3AsC6wJVtYANF8c/SbTKgJgVG',
  'email',
  'driver',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE
  SET password_hash  = EXCLUDED.password_hash,
      full_name      = EXCLUDED.full_name,
      is_active      = TRUE,
      email_verified = TRUE;

-- ── Upsert driver profile row ─────────────────────────────────────────────────
INSERT INTO drivers (user_id, vehicle_type, vehicle_reg, license_number, status)
SELECT id, 'Sedan', 'GP 123-456', 'DL-TEST-001', 'active'
FROM   users
WHERE  email = 'driver@ezygo.co.za'
ON CONFLICT (user_id) DO UPDATE
  SET vehicle_type   = EXCLUDED.vehicle_type,
      vehicle_reg    = EXCLUDED.vehicle_reg,
      license_number = EXCLUDED.license_number,
      status         = 'active';

-- ── Sync Better Auth credential accounts ─────────────────────────────────────
INSERT INTO auth_accounts (
  id,
  account_id,
  provider_id,
  user_id,
  password,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4()::TEXT,
  id::TEXT,
  'credential',
  id,
  password_hash,
  created_at,
  updated_at
FROM users
WHERE email IN ('admin@ezygo.co.za', 'driver@ezygo.co.za', 'customer@ezygo.co.za')
  AND password_hash IS NOT NULL
ON CONFLICT (provider_id, account_id) DO UPDATE
  SET password   = EXCLUDED.password,
      updated_at = NOW();

-- ── Confirm ───────────────────────────────────────────────────────────────────
SELECT id, full_name, email, role, is_active
FROM   users
WHERE  email IN ('admin@ezygo.co.za', 'driver@ezygo.co.za', 'customer@ezygo.co.za')
ORDER  BY role;
