CREATE TABLE IF NOT EXISTS intake_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(32) UNIQUE NOT NULL,
  encrypted_payload BYTEA NOT NULL,
  encryption_iv BYTEA NOT NULL,
  encryption_tag BYTEA NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0),
  priority VARCHAR(16) NOT NULL CHECK (priority IN ('EMERGENCY', 'URGENT', 'STANDARD')),
  assessment JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'DENIED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS intake_requests_review_queue_idx
  ON intake_requests (risk_score DESC, created_at ASC)
  WHERE status = 'PENDING_REVIEW';

CREATE TABLE IF NOT EXISTS case_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intake_id UUID NOT NULL REFERENCES intake_requests(id),
  reviewer_id UUID NOT NULL REFERENCES users(user_id),
  decision VARCHAR(16) NOT NULL CHECK (decision IN ('APPROVED', 'DENIED')),
  notes TEXT NOT NULL DEFAULT '',
  pathways TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (decision <> 'DENIED' OR length(trim(notes)) > 0)
);

CREATE TABLE IF NOT EXISTS resource_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intake_id UUID NOT NULL REFERENCES intake_requests(id),
  pathway VARCHAR(100) NOT NULL,
  category VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ASSIGNED'
    CHECK (status IN ('ASSIGNED', 'DISPATCHED', 'FAILED')),
  estimated_savings_cents BIGINT NOT NULL DEFAULT 0
    CHECK (estimated_savings_cents >= 0),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (intake_id, pathway)
);

CREATE TABLE IF NOT EXISTS system_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id UUID,
  ip_address INET,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS system_audit_logs_target_idx
  ON system_audit_logs (target_type, target_id, created_at DESC);
