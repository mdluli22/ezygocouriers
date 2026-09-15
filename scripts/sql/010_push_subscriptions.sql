-- Browser push subscriptions are scoped to an authenticated user and device.
-- Endpoints are secrets: never expose one user's subscription to another user.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  endpoint            TEXT NOT NULL UNIQUE,
  p256dh               TEXT NOT NULL,
  auth                 TEXT NOT NULL,
  expiration_time      BIGINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions (user_id);

