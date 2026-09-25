ALTER TABLE drivers ADD COLUMN IF NOT EXISTS on_duty BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_delivery_id INTEGER REFERENCES deliveries(id) ON DELETE SET NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_received_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_session_id TEXT REFERENCES auth_sessions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS native_installations (
  id UUID PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  expo_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS native_push_events (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  audience TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS native_push_jobs (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES native_push_events(id) ON DELETE CASCADE,
  installation_id UUID NOT NULL REFERENCES native_installations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ticket_id TEXT,
  sent_token TEXT,
  UNIQUE(event_id, installation_id)
);
CREATE INDEX IF NOT EXISTS native_push_jobs_due ON native_push_jobs(status,next_attempt_at);
-- Events commit atomically with authoritative delivery changes, never from a client.
CREATE OR REPLACE FUNCTION queue_native_delivery_events() RETURNS TRIGGER AS $$
DECLARE driver_user INTEGER;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id THEN
    IF NEW.status IN ('confirmed','paid','assigned','picked_up','delivered','failed') THEN
      INSERT INTO native_push_events(user_id,delivery_id,audience,kind)
        VALUES (NEW.customer_id,NEW.id,'customer',NEW.status);
    END IF;
    IF NEW.status='assigned' AND NEW.assigned_driver_id IS NOT NULL THEN
      SELECT user_id INTO driver_user FROM drivers WHERE id=NEW.assigned_driver_id;
      INSERT INTO native_push_events(user_id,delivery_id,audience,kind)
        VALUES(driver_user,NEW.id,'driver','assigned');
    END IF;
    -- Remove old coordinates on reassignment or terminal state immediately.
    IF NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id OR NEW.status IN ('delivered','failed','cancelled') THEN
      UPDATE drivers SET current_latitude=NULL,current_longitude=NULL,location_updated_at=NULL,
        location_received_at=NULL,location_accuracy=NULL,location_delivery_id=NULL,location_session_id=NULL
        WHERE location_delivery_id=NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS native_delivery_events ON deliveries;
CREATE TRIGGER native_delivery_events AFTER UPDATE OF status,assigned_driver_id ON deliveries
  FOR EACH ROW EXECUTE FUNCTION queue_native_delivery_events();
-- Session revocation immediately removes a driver's shared location.
CREATE OR REPLACE FUNCTION clear_signed_out_driver_location() RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers SET current_latitude=NULL,current_longitude=NULL,location_updated_at=NULL,
    location_received_at=NULL,location_accuracy=NULL,location_delivery_id=NULL,location_session_id=NULL
    WHERE location_session_id=OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS clear_signed_out_location ON auth_sessions;
CREATE TRIGGER clear_signed_out_location BEFORE DELETE ON auth_sessions
  FOR EACH ROW EXECUTE FUNCTION clear_signed_out_driver_location();
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_stopped_at TIMESTAMPTZ;
-- Failed checkout attempts may need customer action without changing delivery status.
CREATE OR REPLACE FUNCTION queue_native_payment_action() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('failed','cancelled') THEN
    INSERT INTO native_push_events(user_id,delivery_id,audience,kind)
      VALUES(NEW.customer_id,NEW.delivery_id,'customer','confirmed');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS native_payment_action ON payments;
CREATE TRIGGER native_payment_action AFTER UPDATE OF status ON payments
  FOR EACH ROW EXECUTE FUNCTION queue_native_payment_action();
