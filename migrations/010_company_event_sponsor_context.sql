-- Migration 010: Company, Event, and Sponsor Context
-- Phase 2: Deepen the Context
--
-- Adds company profile fields to workspaces, event context fields to events,
-- and creates the event_sponsors relational table.
-- These power the unified context layer for all AI operations.

BEGIN;

-- =============================================================================
-- 1. Company profile fields on workspaces
-- =============================================================================
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS company_website TEXT,
  ADD COLUMN IF NOT EXISTS company_description TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS market_position TEXT,
  ADD COLUMN IF NOT EXISTS key_leadership JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS strategic_priorities JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS brand_voice TEXT,
  ADD COLUMN IF NOT EXISTS company_enriched_at TIMESTAMPTZ;

-- =============================================================================
-- 2. Event context fields on events
-- =============================================================================
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS success_criteria TEXT,
  ADD COLUMN IF NOT EXISTS key_stakeholders JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS event_theme TEXT,
  ADD COLUMN IF NOT EXISTS budget_range TEXT,
  ADD COLUMN IF NOT EXISTS additional_context TEXT;

-- =============================================================================
-- 3. Event Sponsors table (relational, supplements existing JSONB column)
-- =============================================================================
CREATE TABLE IF NOT EXISTS event_sponsors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  tier            TEXT,
  logo_url        TEXT,
  website_url     TEXT,
  description     TEXT,
  contact_person  TEXT,
  contact_email   TEXT,
  goals           JSONB DEFAULT '[]',
  promised_seats  INTEGER,
  table_preference TEXT,
  key_attendees   JSONB DEFAULT '[]',
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event ON event_sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_workspace ON event_sponsors(workspace_id);

-- Reuse existing trigger function for updated_at
CREATE TRIGGER set_event_sponsors_updated_at
  BEFORE UPDATE ON event_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
