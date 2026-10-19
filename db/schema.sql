-- BEAST Family First schema (PostgreSQL). See DATABASE_SCHEMA.md.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  head_of_household VARCHAR(255),
  household_size INTEGER,
  county VARCHAR(255),
  state VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS intake_requests (
  id UUID PRIMARY KEY,
  family_id UUID REFERENCES families(id),
  status VARCHAR(50) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','approved','dispatched','closed','denied')),
  priority_level VARCHAR(50) NOT NULL CHECK (priority_level IN ('EMERGENCY','URGENT','STANDARD')),
  priority_score INTEGER NOT NULL,
  risk_factors JSONB NOT NULL DEFAULT '[]',
  suggested_pathways JSONB NOT NULL DEFAULT '[]',
  encrypted_payload TEXT,
  assigned_worker UUID,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_intake_queue ON intake_requests (status, priority_score DESC, created_at);

CREATE TABLE IF NOT EXISTS partner_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name VARCHAR(255) NOT NULL,
  partner_type VARCHAR(100),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  webhook_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES intake_requests(id),
  partner_id UUID REFERENCES partner_organizations(id),
  resource_type VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(100),
  target_id UUID,
  ip_address VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log is append-only (immutable).
CREATE OR REPLACE FUNCTION forbid_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'system_audit_logs is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_immutable ON system_audit_logs;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON system_audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();
