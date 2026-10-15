-- Short-lived, PKCE-bound Google-to-native handoffs. No session token in URLs.
CREATE TABLE IF NOT EXISTS mobile_oauth_flows (
  request_id TEXT PRIMARY KEY,
  code_challenge TEXT NOT NULL,
  client_state TEXT NOT NULL,
  browser_hash TEXT,
  code_hash TEXT UNIQUE,
  encrypted_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
);
CREATE INDEX IF NOT EXISTS idx_mobile_oauth_flows_expiry ON mobile_oauth_flows (expires_at);

