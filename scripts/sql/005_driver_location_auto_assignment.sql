-- =============================================================================
-- Driver location for proximity-based automatic delivery assignment
-- Migration: 005_driver_location_auto_assignment.sql
-- =============================================================================

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS current_latitude    DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS current_longitude   DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_drivers_current_latitude'
      AND conrelid = 'drivers'::regclass
  ) THEN
    ALTER TABLE drivers
      ADD CONSTRAINT chk_drivers_current_latitude
      CHECK (current_latitude IS NULL OR current_latitude BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_drivers_current_longitude'
      AND conrelid = 'drivers'::regclass
  ) THEN
    ALTER TABLE drivers
      ADD CONSTRAINT chk_drivers_current_longitude
      CHECK (current_longitude IS NULL OR current_longitude BETWEEN -180 AND 180);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_drivers_location_updated_at
  ON drivers (location_updated_at)
  WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_unassigned_paid
  ON deliveries (created_at, id)
  WHERE status = 'paid' AND assigned_driver_id IS NULL;
