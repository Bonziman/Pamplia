-- Manual migration for tenant billing and payment tracking.
-- Run against your PostgreSQL database (pamplia_dev or production DB) once.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_plan VARCHAR NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS billing_status VARCHAR NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_notes TEXT;

CREATE TABLE IF NOT EXISTS tenant_payment_records (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  amount DOUBLE PRECISION NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MAD',
  payment_method VARCHAR NOT NULL DEFAULT 'cash',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS ix_tenant_payment_records_tenant_id ON tenant_payment_records(tenant_id);
