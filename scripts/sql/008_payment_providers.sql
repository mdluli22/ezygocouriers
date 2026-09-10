-- =============================================================================
-- EzyGo multiple payment providers
-- Migration: 008_payment_providers.sql
-- =============================================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'payfast',
  ADD COLUMN IF NOT EXISTS provider_checkout_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_checkout_id
  ON payments (provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_provider
  ON payments (provider);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_provider_check'
      AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_provider_check
      CHECK (provider IN ('payfast', 'yoco'));
  END IF;
END
$$;
