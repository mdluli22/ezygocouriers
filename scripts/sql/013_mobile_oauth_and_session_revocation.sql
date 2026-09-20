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

-- Account state changes revoke existing sessions, including sessions that would
-- otherwise become usable again after an account is reactivated.
CREATE OR REPLACE FUNCTION revoke_ineligible_auth_sessions() RETURNS TRIGGER AS $$
BEGIN
  IF NOT NEW.is_active OR NOT NEW.email_verified THEN
    DELETE FROM auth_sessions WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS revoke_ineligible_sessions ON users;
CREATE TRIGGER revoke_ineligible_sessions
AFTER UPDATE OF is_active, email_verified ON users
FOR EACH ROW EXECUTE FUNCTION revoke_ineligible_auth_sessions();

CREATE OR REPLACE FUNCTION require_eligible_session_user() RETURNS TRIGGER AS $$
DECLARE eligible BOOLEAN;
BEGIN
  SELECT is_active AND email_verified INTO eligible FROM users
  WHERE id = NEW.user_id FOR SHARE;
  IF eligible IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Account is not eligible for a session' USING ERRCODE = '28000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS require_eligible_session ON auth_sessions;
CREATE TRIGGER require_eligible_session BEFORE INSERT ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION require_eligible_session_user();

DELETE FROM auth_sessions s USING users u
WHERE s.user_id = u.id AND (NOT u.is_active OR NOT u.email_verified);
-- Periodically delete expired handoffs: DELETE FROM mobile_oauth_flows WHERE expires_at < NOW();
