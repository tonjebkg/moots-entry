-- Migration 003: People Database, Event Objectives, and AI Scoring
-- Phase 2 Core Intelligence for Moots Entry Dashboard
--
-- Creates: people_contacts, event_objectives, guest_scores, scoring_jobs, enrichment_jobs
-- Alters: campaign_invitations (add contact_id FK)

BEGIN;

-- =============================================================================
-- 1. People Contacts table (persistent People Database, workspace-scoped)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE enrichment_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'STALE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_source AS ENUM ('MANUAL', 'CSV_IMPORT', 'EVENT_IMPORT', 'API', 'ENRICHMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS people_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Identity
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,

  -- Contact info (JSONB arrays for multiple)
  emails JSONB DEFAULT '[]',
  phones JSONB DEFAULT '[]',

  -- Professional
  company TEXT,
  title TEXT,
  role_seniority TEXT,
  industry TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,

  -- Wealth/influence intelligence
  net_worth_range TEXT,
  board_affiliations JSONB DEFAULT '[]',

  -- Enrichment
  enrichment_data JSONB DEFAULT '{}',
  enrichment_status enrichment_status NOT NULL DEFAULT 'PENDING',
  enriched_at TIMESTAMPTZ,
  enrichment_cost_cents INTEGER DEFAULT 0,
  ai_summary TEXT,

  -- Organization
  tags TEXT[] DEFAULT '{}',
  internal_notes TEXT,
  source contact_source NOT NULL DEFAULT 'MANUAL',
  source_detail TEXT,

  -- Cross-event tracking
  event_history JSONB DEFAULT '[]',

  -- Deduplication
  dedup_key TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for people_contacts
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON people_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_emails ON people_contacts USING GIN (emails);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON people_contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON people_contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON people_contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_contacts_linkedin ON people_contacts(linkedin_url) WHERE linkedin_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_dedup_key ON people_contacts(workspace_id, dedup_key);
CREATE INDEX IF NOT EXISTS idx_contacts_enrichment_status ON people_contacts(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON people_contacts(created_at DESC);

-- Full-text search index on name + company + title
CREATE INDEX IF NOT EXISTS idx_contacts_search ON people_contacts
  USING GIN (to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(company, '') || ' ' || COALESCE(title, '')));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_contacts_updated_at ON people_contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON people_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. Event Objectives table (scoring criteria per event)
-- =============================================================================
CREATE TABLE IF NOT EXISTS event_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  objective_text TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  criteria_config JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_objectives_event ON event_objectives(event_id);
CREATE INDEX IF NOT EXISTS idx_event_objectives_workspace ON event_objectives(workspace_id);

DROP TRIGGER IF EXISTS update_event_objectives_updated_at ON event_objectives;
CREATE TRIGGER update_event_objectives_updated_at
  BEFORE UPDATE ON event_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. Guest Scores table (per-contact, per-event AI scoring results)
-- =============================================================================
CREATE TABLE IF NOT EXISTS guest_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES people_contacts(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  relevance_score INTEGER NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  matched_objectives JSONB DEFAULT '[]',
  score_rationale TEXT,
  talking_points JSONB DEFAULT '[]',

  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version TEXT,

  UNIQUE(contact_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_guest_scores_contact ON guest_scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_guest_scores_event ON guest_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_scores_workspace ON guest_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_guest_scores_relevance ON guest_scores(event_id, relevance_score DESC);

-- =============================================================================
-- 4. Scoring Jobs table (async batch scoring progress tracking)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS scoring_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  status job_status NOT NULL DEFAULT 'PENDING',
  total_contacts INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_jobs_event ON scoring_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_scoring_jobs_status ON scoring_jobs(status);

-- =============================================================================
-- 5. Enrichment Jobs table (async batch enrichment progress tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  status job_status NOT NULL DEFAULT 'PENDING',
  total_contacts INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  contact_ids UUID[] DEFAULT '{}',

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_workspace ON enrichment_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);

-- =============================================================================
-- 6. Bridge: Add contact_id to campaign_invitations
-- =============================================================================
ALTER TABLE campaign_invitations ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES people_contacts(id);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_contact ON campaign_invitations(contact_id) WHERE contact_id IS NOT NULL;

COMMIT;
