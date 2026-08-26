-- =============================================================================
-- EzyGo Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Full initial schema for EzyGo courier and delivery platform
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'driver', 'admin');

CREATE TYPE auth_provider AS ENUM ('email', 'google');

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'quoted',
  'confirmed',
  'paid',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'failed',
  'cancelled'
);

CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'expired', 'rejected');

CREATE TYPE payment_status AS ENUM ('pending', 'complete', 'failed', 'cancelled');

CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'suspended');

-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE users (
  id               SERIAL PRIMARY KEY,
  full_name        VARCHAR(255)        NOT NULL,
  email            VARCHAR(255)        NOT NULL UNIQUE,
  phone            VARCHAR(20),
  password_hash    TEXT,                             -- NULL for Google-only users
  google_id        VARCHAR(255)        UNIQUE,       -- NULL for email/password users
  auth_provider    auth_provider       NOT NULL DEFAULT 'email',
  role             user_role           NOT NULL DEFAULT 'customer',
  is_active        BOOLEAN             NOT NULL DEFAULT TRUE,
  email_verified   BOOLEAN             NOT NULL DEFAULT FALSE,
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

  -- At least one auth method must be present
  CONSTRAINT chk_auth_method CHECK (
    password_hash IS NOT NULL OR google_id IS NOT NULL
  )
);

CREATE INDEX idx_users_email        ON users (email);
CREATE INDEX idx_users_google_id    ON users (google_id);
CREATE INDEX idx_users_role         ON users (role);

-- =============================================================================
-- DRIVERS
-- =============================================================================

CREATE TABLE drivers (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER             NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  vehicle_type       VARCHAR(100),
  vehicle_reg        VARCHAR(50),
  license_number     VARCHAR(100),
  status             driver_status       NOT NULL DEFAULT 'active',
  current_latitude   DECIMAL(10, 8),
  current_longitude  DECIMAL(11, 8),
  location_updated_at TIMESTAMPTZ,
  notes              TEXT,                           -- Admin notes about the driver
  created_at         TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_user_id    ON drivers (user_id);
CREATE INDEX idx_drivers_status     ON drivers (status);
CREATE INDEX idx_drivers_location_updated_at
  ON drivers (location_updated_at)
  WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

-- =============================================================================
-- ADDRESSES
-- =============================================================================

CREATE TABLE addresses (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER             REFERENCES users (id) ON DELETE SET NULL,
  street_address   VARCHAR(255)        NOT NULL,
  suburb           VARCHAR(100),
  city             VARCHAR(100)        NOT NULL,
  province         VARCHAR(100),
  postal_code      VARCHAR(20),
  country          VARCHAR(100)        NOT NULL DEFAULT 'South Africa',
  latitude         DECIMAL(10, 8),
  longitude        DECIMAL(11, 8),
  notes            TEXT,
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id  ON addresses (user_id);

-- =============================================================================
-- PRICING RULES
-- =============================================================================

CREATE TABLE pricing_rules (
  id               SERIAL PRIMARY KEY,
  rule_name        VARCHAR(100)        NOT NULL UNIQUE,
  flat_fee         DECIMAL(10, 2)      NOT NULL DEFAULT 99.00,
  currency         VARCHAR(10)         NOT NULL DEFAULT 'ZAR',
  is_active        BOOLEAN             NOT NULL DEFAULT TRUE,
  description      TEXT,
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Seed default pricing rule
INSERT INTO pricing_rules (rule_name, flat_fee, currency, description)
VALUES ('standard_delivery', 99.00, 'ZAR', 'Standard flat delivery fee for all deliveries');

-- =============================================================================
-- QUOTES
-- =============================================================================

CREATE TABLE quotes (
  id               SERIAL PRIMARY KEY,
  pricing_rule_id  INTEGER             REFERENCES pricing_rules (id) ON DELETE SET NULL,
  amount           DECIMAL(10, 2)      NOT NULL,
  currency         VARCHAR(10)         NOT NULL DEFAULT 'ZAR',
  status           quote_status        NOT NULL DEFAULT 'pending',
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_status      ON quotes (status);

-- =============================================================================
-- DELIVERIES
-- =============================================================================

CREATE TABLE deliveries (
  id                   SERIAL PRIMARY KEY,
  customer_id          INTEGER             NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  assigned_driver_id   INTEGER             REFERENCES drivers (id) ON DELETE SET NULL,
  pickup_address_id    INTEGER             NOT NULL REFERENCES addresses (id) ON DELETE RESTRICT,
  dropoff_address_id   INTEGER             NOT NULL REFERENCES addresses (id) ON DELETE RESTRICT,
  quote_id             INTEGER             REFERENCES quotes (id) ON DELETE SET NULL,

  -- Pickup contact details
  pickup_contact_name  VARCHAR(255)        NOT NULL,
  pickup_contact_phone VARCHAR(20)         NOT NULL,

  -- Recipient details
  recipient_name       VARCHAR(255)        NOT NULL,
  recipient_phone      VARCHAR(20)         NOT NULL,

  -- Parcel details
  parcel_description   TEXT                NOT NULL,
  special_instructions TEXT,

  -- Tracking
  tracking_number      VARCHAR(50)         NOT NULL UNIQUE DEFAULT CONCAT('EZY-', UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))),
  status               delivery_status     NOT NULL DEFAULT 'pending',

  created_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_customer_id        ON deliveries (customer_id);
CREATE INDEX idx_deliveries_assigned_driver_id ON deliveries (assigned_driver_id);
CREATE INDEX idx_deliveries_status             ON deliveries (status);
CREATE INDEX idx_deliveries_tracking_number    ON deliveries (tracking_number);
CREATE INDEX idx_deliveries_created_at         ON deliveries (created_at DESC);

-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE TABLE payments (
  id                   SERIAL PRIMARY KEY,
  delivery_id          INTEGER             NOT NULL REFERENCES deliveries (id) ON DELETE RESTRICT,
  quote_id             INTEGER             REFERENCES quotes (id) ON DELETE SET NULL,
  amount               DECIMAL(10, 2)      NOT NULL,
  currency             VARCHAR(10)         NOT NULL DEFAULT 'ZAR',
  status               payment_status      NOT NULL DEFAULT 'pending',

  -- PayFast specific
  payfast_payment_id   VARCHAR(255),
  payfast_pf_payment_id VARCHAR(255),
  merchant_payment_id  VARCHAR(255)        UNIQUE,

  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_delivery_id         ON payments (delivery_id);
CREATE INDEX idx_payments_status              ON payments (status);
CREATE INDEX idx_payments_merchant_payment_id ON payments (merchant_payment_id);

-- =============================================================================
-- DELIVERY STATUS LOGS
-- =============================================================================

CREATE TABLE delivery_status_logs (
  id               SERIAL PRIMARY KEY,
  delivery_id      INTEGER             NOT NULL REFERENCES deliveries (id) ON DELETE CASCADE,
  status           delivery_status     NOT NULL,
  note             TEXT,
  updated_by       INTEGER             REFERENCES users (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_status_logs_delivery_id ON delivery_status_logs (delivery_id);
CREATE INDEX idx_delivery_status_logs_created_at  ON delivery_status_logs (created_at DESC);

-- =============================================================================
-- CONTACT MESSAGES
-- =============================================================================

CREATE TABLE contact_messages (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255)        NOT NULL,
  email            VARCHAR(255)        NOT NULL,
  phone            VARCHAR(20),
  subject          VARCHAR(255)        NOT NULL,
  message          TEXT                NOT NULL,
  is_read          BOOLEAN             NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_is_read   ON contact_messages (is_read);
CREATE INDEX idx_contact_messages_created_at ON contact_messages (created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_drivers
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_deliveries
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_quotes
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_pricing_rules
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- SEED: DEFAULT ADMIN USER
-- Password: changeme123 (bcrypt — MUST be changed immediately after first login)
-- =============================================================================

INSERT INTO users (full_name, email, password_hash, auth_provider, role, is_active, email_verified)
VALUES (
  'EzyGo Admin',
  'admin@ezygo.co.za',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGNv8FYqYmFkfQkL9TwXpOZwQ2K',
  'email',
  'admin',
  TRUE,
  TRUE
);
