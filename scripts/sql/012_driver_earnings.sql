BEGIN;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS route_distance_meters INTEGER CHECK (route_distance_meters >= 0);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS route_verified_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS driver_delivery_earnings (
 delivery_id INTEGER PRIMARY KEY REFERENCES deliveries(id) ON DELETE RESTRICT,
 driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
 completed_at TIMESTAMPTZ,
 distance_meters INTEGER CHECK(distance_meters >= 0),
 amount_cents INTEGER CHECK(amount_cents >= 0),
 rate_version TEXT NOT NULL DEFAULT 'rider-pay-v1',
 distance_source TEXT CHECK(distance_source IN ('google_routes','admin_verified')),
 approved_by INTEGER REFERENCES users(id),
 approval_note TEXT,
 approved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(amount_cents IS NULL OR (distance_meters IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_period ON driver_delivery_earnings(driver_id, completed_at);
CREATE TABLE IF NOT EXISTS driver_weekly_payouts (
 id SERIAL PRIMARY KEY,
 driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
 week_start DATE NOT NULL CHECK(EXTRACT(ISODOW FROM week_start) = 1),
 amount_cents BIGINT NOT NULL CHECK(amount_cents >= 0),
 delivery_count INTEGER NOT NULL CHECK(delivery_count > 0),
 paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 recorded_by INTEGER NOT NULL REFERENCES users(id),
 reference TEXT NOT NULL,
 UNIQUE(driver_id, week_start)
);
CREATE TABLE IF NOT EXISTS driver_earning_audit (
 id SERIAL PRIMARY KEY,
 delivery_id INTEGER NOT NULL REFERENCES deliveries(id),
 admin_id INTEGER NOT NULL REFERENCES users(id),
 previous_value JSONB NOT NULL,
 new_value JSONB NOT NULL,
 note TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Historical completion comes from the status log, never mutable updated_at.
-- Missing distance or completion time remains pending for admin verification.
INSERT INTO driver_delivery_earnings(delivery_id,driver_id,completed_at)
SELECT d.id, COALESCE(dr.id,d.assigned_driver_id), l.created_at
FROM deliveries d
LEFT JOIN LATERAL (SELECT created_at,updated_by FROM delivery_status_logs
 WHERE delivery_id=d.id AND status='delivered' ORDER BY created_at,id LIMIT 1) l ON TRUE
LEFT JOIN drivers dr ON dr.user_id=l.updated_by
WHERE d.status='delivered' AND COALESCE(dr.id,d.assigned_driver_id) IS NOT NULL
ON CONFLICT(delivery_id) DO NOTHING;
COMMIT;
