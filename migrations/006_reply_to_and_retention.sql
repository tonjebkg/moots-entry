-- Migration 006: Reply-To workspace config + audit log retention support
-- Resolves Open Questions #9 (follow-up sender identity) and #15 (audit log retention)

-- Add Reply-To fields to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS reply_to_email TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS reply_to_name TEXT;

-- Index for audit log cleanup by timestamp (used by retention cron)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Index for session cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Index for job cleanup
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_completed_at ON enrichment_jobs(completed_at);
CREATE INDEX IF NOT EXISTS idx_scoring_jobs_completed_at ON scoring_jobs(completed_at);
