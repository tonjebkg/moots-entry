-- Migration 012: Add referred_by to campaign_invitations
-- Tracks which workspace member (partner, sponsor, team member) referred this guest

BEGIN;

ALTER TABLE campaign_invitations
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_campaign_invitations_referred_by
  ON campaign_invitations(referred_by) WHERE referred_by IS NOT NULL;

COMMIT;
