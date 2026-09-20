-- Reuse a pending hosted checkout instead of creating another provider session
-- when a customer double-taps or retries after receiving a successful response.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT;
