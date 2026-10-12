BEGIN;

CREATE TABLE IF NOT EXISTS request_rate_limits (
  key_hash text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT NOW(),
  hits integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS request_rate_limits_expiry ON request_rate_limits(expires_at);

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS booking_key uuid;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS booking_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS delivery_booking_key ON deliveries(customer_id, booking_key);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_response jsonb;

CREATE TABLE IF NOT EXISTS payment_reviews (
  id bigserial PRIMARY KEY,
  payment_id integer NOT NULL REFERENCES payments(id),
  provider_payment_id text NOT NULL,
  delivery_id integer NOT NULL REFERENCES deliveries(id),
  reason text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','refunded','resolved')),
  resolution_note text,
  refund_reference text,
  resolved_by integer REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, provider_payment_id)
);
CREATE TABLE IF NOT EXISTS payment_review_audit (
  id bigserial PRIMARY KEY,
  review_id bigint NOT NULL REFERENCES payment_reviews(id),
  actor_id integer NOT NULL REFERENCES users(id),
  status text NOT NULL,
  note text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id bigserial PRIMARY KEY,
  dedupe_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('pin_email','completed_email','push')),
  delivery_id integer REFERENCES deliveries(id),
  encrypted_payload text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT NOW(),
  lease_token uuid,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS notification_outbox_due ON notification_outbox(status, available_at);

-- Existing completed payments on cancelled deliveries need an explicit review.
INSERT INTO payment_reviews(payment_id, provider_payment_id, delivery_id, reason, amount, currency)
SELECT p.id, COALESCE(p.provider_payment_id, 'legacy-' || p.id), p.delivery_id,
       'Cancelled delivery with a completed payment', p.amount, p.currency
FROM payments p JOIN deliveries d ON d.id=p.delivery_id
WHERE p.status='complete' AND d.status='cancelled'
ON CONFLICT DO NOTHING;
COMMIT;
