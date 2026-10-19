CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('CaseWorker','Supervisor','Administrator','Auditor')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- Per-partner HMAC secret for X-BEAST-Signature (falls back to WEBHOOK_SIGNING_SECRET).
ALTER TABLE partner_organizations ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
