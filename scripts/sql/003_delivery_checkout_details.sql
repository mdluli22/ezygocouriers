-- =============================================================================
-- EzyGo delivery checkout details and payment compatibility
-- Migration: 003_delivery_checkout_details.sql
--
-- Persists the structured address, parcel, handling, PIN, and scheduling values
-- accepted by the delivery checkout. It also brings the payments table in line
-- with the payment service introduced after the initial schema.
--
-- This migration is intentionally idempotent so it is safe to re-run.
-- =============================================================================

-- =============================================================================
-- STRUCTURED ADDRESSES
-- =============================================================================

ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS formatted_address     VARCHAR(500),
  ADD COLUMN IF NOT EXISTS building_or_business VARCHAR(255),
  ADD COLUMN IF NOT EXISTS apt_suite             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS meeting_option        VARCHAR(30);

-- Existing rows used street_address as their display/geocoded address.
UPDATE addresses
SET formatted_address = street_address
WHERE formatted_address IS NULL;

ALTER TABLE addresses
  ALTER COLUMN formatted_address SET NOT NULL,
  -- Google Places can provide a complete formatted address without a separate
  -- city component, so the structured city value must remain optional.
  ALTER COLUMN city DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_addresses_meeting_option'
      AND conrelid = 'addresses'::regclass
  ) THEN
    ALTER TABLE addresses
      ADD CONSTRAINT chk_addresses_meeting_option
      CHECK (
        meeting_option IS NULL OR meeting_option IN (
          'meet_at_curb',
          'meet_at_door',
          'leave_at_door'
        )
      );
  END IF;
END
$$;

-- =============================================================================
-- DELIVERY CHECKOUT DETAILS
-- =============================================================================

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS package_type          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS package_category      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fragile               BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_pin           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_pin_hash     TEXT,
  ADD COLUMN IF NOT EXISTS pin_verified_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_time        TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_deliveries_package_type'
      AND conrelid = 'deliveries'::regclass
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT chk_deliveries_package_type
      CHECK (package_type IS NULL OR package_type IN ('small', 'medium', 'large'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_deliveries_pin_verification'
      AND conrelid = 'deliveries'::regclass
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT chk_deliveries_pin_verification
      CHECK (pin_verified_at IS NULL OR require_pin = TRUE);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_time
  ON deliveries (scheduled_time)
  WHERE scheduled_time IS NOT NULL;

-- =============================================================================
-- PAYMENT SERVICE COMPATIBILITY
-- =============================================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS customer_id    INTEGER,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- A payment belongs to the same customer as its delivery. Backfill before
-- enforcing the foreign key and NOT NULL constraint for existing databases.
UPDATE payments p
SET customer_id = d.customer_id
FROM deliveries d
WHERE d.id = p.delivery_id
  AND p.customer_id IS NULL;

ALTER TABLE payments
  ALTER COLUMN customer_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_customer_id_fkey'
      AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_payments_customer_id
  ON payments (customer_id);
