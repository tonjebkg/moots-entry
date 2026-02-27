-- Migration 009: Agent Infrastructure
-- Phase 1: Make the Agent Visible
--
-- Creates: agent_activity_log, agent_conversations, override_log
-- These tables power the agent activity feed, chat panel, and override tracking.

BEGIN;

-- =============================================================================
-- 1. Agent Activity Log: every meaningful agent action with narrative
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'scoring', 'enrichment', 'briefing', 'seating', 'introduction', 'follow_up', 'observation'
  headline      TEXT NOT NULL, -- "Scored 47 contacts against 3 objectives"
  detail        TEXT,          -- Longer narrative with specifics
  metadata      JSONB DEFAULT '{}', -- Structured data (counts, contact_ids, scores)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_event ON agent_activity_log(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_workspace ON agent_activity_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_type ON agent_activity_log(activity_type);

-- =============================================================================
-- 2. Agent Conversations: chat message history per event per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}', -- page context, action taken, etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_event ON agent_conversations(event_id, user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_workspace ON agent_conversations(workspace_id);

-- =============================================================================
-- 3. Override Log: track user overrides of agent suggestions
-- =============================================================================
CREATE TABLE IF NOT EXISTS override_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  override_type   TEXT NOT NULL, -- 'seating_move', 'score_override', 'suggestion_reject'
  entity_type     TEXT NOT NULL, -- 'contact', 'table', 'pairing'
  entity_id       TEXT NOT NULL,
  original_value  JSONB,
  new_value       JSONB,
  user_reason     TEXT,          -- Optional: why they overrode
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_override_log_event ON override_log(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_override_log_workspace ON override_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_override_log_type ON override_log(override_type);

COMMIT;
