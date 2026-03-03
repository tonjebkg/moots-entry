BEGIN;

-- Team member messaging channel links
CREATE TABLE IF NOT EXISTS team_member_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('telegram', 'whatsapp')),
  channel_user_id TEXT NOT NULL,
  display_name TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  pairing_code TEXT,
  pairing_expires_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_type, channel_user_id)
);

CREATE INDEX IF NOT EXISTS idx_tmc_lookup ON team_member_channels(channel_type, channel_user_id);
CREATE INDEX IF NOT EXISTS idx_tmc_user ON team_member_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_tmc_pairing ON team_member_channels(pairing_code) WHERE pairing_code IS NOT NULL;

-- Messaging conversation history (separate from dashboard agent_conversations)
CREATE TABLE IF NOT EXISTS messaging_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  channel_type TEXT NOT NULL,
  channel_user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mc_user_channel ON messaging_conversations(user_id, channel_type);

COMMIT;
