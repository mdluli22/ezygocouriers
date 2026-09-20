-- Shared, atomic limits across web/mobile routes and all application replicas.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL CHECK (hits > 0),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expiry ON api_rate_limits (expires_at);

-- Run periodically in production (e.g. every hour):
-- DELETE FROM api_rate_limits WHERE expires_at < NOW();
