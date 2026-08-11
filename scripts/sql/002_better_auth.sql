-- =============================================================================
-- Better Auth migration
-- Keeps the existing users table and integer IDs used by business tables.
-- Authentication credentials, OAuth providers, and sessions move into
-- Better Auth-owned tables.
-- =============================================================================

-- Better Auth creates the user before its credential/provider account, so the
-- legacy constraint tying auth data directly to users is no longer applicable.
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_auth_method;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id          TEXT        PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT,
  user_id     INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id                       TEXT        PRIMARY KEY,
  account_id               TEXT        NOT NULL,
  provider_id              TEXT        NOT NULL,
  user_id                   INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  access_token              TEXT,
  refresh_token             TEXT,
  id_token                  TEXT,
  access_token_expires_at   TIMESTAMPTZ,
  refresh_token_expires_at  TIMESTAMPTZ,
  scope                     TEXT,
  password                  TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_auth_account_provider UNIQUE (provider_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id
  ON auth_accounts (user_id);

CREATE TABLE IF NOT EXISTS auth_verifications (
  id          TEXT        PRIMARY KEY,
  identifier  TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_verifications_identifier
  ON auth_verifications (identifier);

-- Migrate existing email/password credentials without changing their hashes.
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
WHERE password_hash IS NOT NULL
ON CONFLICT (provider_id, account_id) DO NOTHING;

-- Migrate existing Google identities.
INSERT INTO auth_accounts (
  id,
  account_id,
  provider_id,
  user_id,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4()::TEXT,
  google_id,
  'google',
  id,
  created_at,
  updated_at
FROM users
WHERE google_id IS NOT NULL
ON CONFLICT (provider_id, account_id) DO NOTHING;
