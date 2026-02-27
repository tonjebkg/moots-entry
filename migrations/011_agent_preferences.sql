-- Migration 011: Agent Preferences
-- Phase 3: Close the Agent Loop
--
-- Creates: agent_preferences — stores learned workspace-level preferences
-- extracted from user overrides (seating moves, score overrides, etc.)

BEGIN;

CREATE TABLE IF NOT EXISTS agent_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,        -- 'seating', 'scoring', 'follow_up', 'general'
  preference_key    TEXT NOT NULL,        -- 'executive_clustering', 'competitor_separation'
  preference_text   TEXT NOT NULL,        -- "Team prefers grouping executives at the same table"
  confidence        REAL NOT NULL DEFAULT 0.5,  -- 0.0-1.0
  observation_count INTEGER NOT NULL DEFAULT 1,
  last_observed     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_preferences_workspace
  ON agent_preferences(workspace_id, category);

COMMIT;
