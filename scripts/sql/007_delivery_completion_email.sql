-- Records delivery-success email notification state for the sender/customer.
-- Idempotent so it can be applied safely to existing databases.

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS delivery_completed_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_deliveries_pending_completion_email
  ON deliveries (id)
  WHERE status = 'delivered' AND delivery_completed_email_sent_at IS NULL;
