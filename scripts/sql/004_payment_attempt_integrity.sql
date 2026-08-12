-- =============================================================================
-- EzyGo payment attempt integrity
-- Migration: 004_payment_attempt_integrity.sql
--
-- React development mode or repeated clicks can initialise checkout more than
-- once. Keep the newest pending attempt and enforce one pending payment per
-- delivery from this point forward.
-- =============================================================================

WITH ranked_pending AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY delivery_id
      ORDER BY created_at DESC, id DESC
    ) AS attempt_rank
  FROM payments
  WHERE status = 'pending'
)
UPDATE payments p
SET status = 'cancelled',
    failure_reason = 'Superseded by a newer payment attempt',
    updated_at = NOW()
FROM ranked_pending ranked
WHERE p.id = ranked.id
  AND ranked.attempt_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_pending_per_delivery
  ON payments (delivery_id)
  WHERE status = 'pending';

