-- Recipient contact and PIN notification state.
-- Idempotent so it can be applied safely to existing databases.

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(320),
  ADD COLUMN IF NOT EXISTS delivery_pin_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_deliveries_pending_pin_notification
  ON deliveries (id)
  WHERE require_pin = TRUE AND delivery_pin_sent_at IS NULL;
