-- Receipt and status change commit together. Retain receipts while the user exists.
CREATE TABLE IF NOT EXISTS driver_operation_receipts (
  driver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL,
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (driver_user_id, operation_id)
);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
