-- 016: Check-in tokens for Staff Door View
-- Shareable, no-auth-required URLs for door staff to manage check-in

CREATE TABLE IF NOT EXISTS checkin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  pin_code TEXT,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkin_tokens_token ON checkin_tokens(token);
CREATE INDEX IF NOT EXISTS idx_checkin_tokens_event ON checkin_tokens(event_id);
