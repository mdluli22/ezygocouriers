-- =============================================================================
-- EzyGo Paystack payment provider
-- Migration: 009_paystack_provider.sql
--
-- PayFast and Yoco remain valid for historical payment records, but Paystack
-- becomes the default and the only provider offered by the application.
-- =============================================================================

ALTER TABLE payments
  ALTER COLUMN provider SET DEFAULT 'paystack';

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('payfast', 'yoco', 'paystack'));
