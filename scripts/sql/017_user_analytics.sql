-- Visible signed-in browser sessions send a heartbeat once a minute.
-- Session deletion automatically removes presence; no IPs or browsing paths are stored.
CREATE TABLE IF NOT EXISTS auth_session_presence (
  session_id TEXT PRIMARY KEY REFERENCES auth_sessions(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_session_presence_last_seen
  ON auth_session_presence(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
