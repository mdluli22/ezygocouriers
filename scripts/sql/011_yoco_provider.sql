-- Yoco is the active checkout provider. Historical provider values stay valid.
ALTER TABLE payments
  ALTER COLUMN provider SET DEFAULT 'yoco';
