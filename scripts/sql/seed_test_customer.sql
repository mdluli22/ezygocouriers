-- =============================================================================
-- LOCAL TEST CUSTOMER (idempotent)
-- Email:    customer@ezygo.co.za
-- Password: Customer@1234
-- =============================================================================

BEGIN;

INSERT INTO users (
  full_name,
  email,
  phone,
  password_hash,
  auth_provider,
  role,
  is_active,
  email_verified
)
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
SET full_name      = EXCLUDED.full_name,
    phone          = EXCLUDED.phone,
    password_hash  = EXCLUDED.password_hash,
    auth_provider  = 'email',
    role           = 'customer',
    is_active      = TRUE,
    email_verified = TRUE,
    updated_at     = NOW();

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
WHERE email = 'customer@ezygo.co.za'
  AND password_hash IS NOT NULL
ON CONFLICT (provider_id, account_id) DO UPDATE
SET password   = EXCLUDED.password,
    updated_at = NOW();

COMMIT;

SELECT id, full_name, email, phone, role, is_active, email_verified
FROM users
WHERE email = 'customer@ezygo.co.za';
