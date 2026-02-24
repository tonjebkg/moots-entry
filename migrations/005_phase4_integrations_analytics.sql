-- Migration 005: Phase 4 — Integrations & Analytics
-- Adds seating suggestions, introduction pairings, CRM connections, CRM sync log

BEGIN;

-- ─── Extend contact_source enum for workspace imports ─────────────────────
ALTER TYPE contact_source ADD VALUE IF NOT EXISTS 'AIRTABLE_IMPORT';
ALTER TYPE contact_source ADD VALUE IF NOT EXISTS 'NOTION_IMPORT';

-- ─── Seating Suggestions ──────────────────────────────────────────────────
-- AI-generated seating recommendations per event

CREATE TABLE IF NOT EXISTS seating_suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES people_contacts(id) ON DELETE CASCADE,
  table_number  INTEGER NOT NULL,
  seat_number   INTEGER,
  rationale     TEXT,
  confidence    REAL CHECK (confidence >= 0 AND confidence <= 1),
  batch_id      UUID NOT NULL,  -- Groups suggestions from a single generation run
  model_version TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seating_suggestions_event ON seating_suggestions(event_id, workspace_id);
CREATE INDEX idx_seating_suggestions_batch ON seating_suggestions(batch_id);
CREATE INDEX idx_seating_suggestions_contact ON seating_suggestions(contact_id);

-- ─── Introduction Pairings ────────────────────────────────────────────────
-- AI-suggested guest pairings ("these two should meet")

CREATE TABLE IF NOT EXISTS introduction_pairings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_a_id    UUID NOT NULL REFERENCES people_contacts(id) ON DELETE CASCADE,
  contact_b_id    UUID NOT NULL REFERENCES people_contacts(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  mutual_interest TEXT,
  priority        INTEGER DEFAULT 0,  -- Higher = more important pairing
  batch_id        UUID NOT NULL,
  model_version   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT introduction_pairings_different_contacts CHECK (contact_a_id != contact_b_id)
);

CREATE INDEX idx_introduction_pairings_event ON introduction_pairings(event_id, workspace_id);
CREATE INDEX idx_introduction_pairings_batch ON introduction_pairings(batch_id);
CREATE INDEX idx_introduction_pairings_contacts ON introduction_pairings(contact_a_id, contact_b_id);

-- ─── CRM Connections ──────────────────────────────────────────────────────
-- Workspace-level CRM integration configurations

CREATE TYPE crm_provider AS ENUM ('SALESFORCE', 'HUBSPOT');
CREATE TYPE crm_sync_direction AS ENUM ('PUSH', 'PULL', 'BIDIRECTIONAL');

CREATE TABLE IF NOT EXISTS crm_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider        crm_provider NOT NULL,
  name            TEXT NOT NULL,
  credentials     JSONB NOT NULL DEFAULT '{}',  -- Encrypted API keys/tokens
  field_mapping   JSONB NOT NULL DEFAULT '{}',  -- Moots field → CRM field mapping
  sync_direction  crm_sync_direction NOT NULL DEFAULT 'PUSH',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_sync_at    TIMESTAMPTZ,
  last_sync_status TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_connections_workspace ON crm_connections(workspace_id);
CREATE UNIQUE INDEX idx_crm_connections_workspace_provider ON crm_connections(workspace_id, provider) WHERE is_active = true;

-- ─── CRM Sync Log ─────────────────────────────────────────────────────────
-- Per-contact CRM sync audit trail

CREATE TYPE crm_sync_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');

CREATE TABLE IF NOT EXISTS crm_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES people_contacts(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,  -- 'contact', 'follow_up', etc.
  entity_id       TEXT NOT NULL,
  direction       crm_sync_direction NOT NULL DEFAULT 'PUSH',
  status          crm_sync_status NOT NULL DEFAULT 'PENDING',
  crm_record_id   TEXT,  -- External ID in the CRM
  request_payload JSONB,
  response_payload JSONB,
  error_message   TEXT,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_sync_log_connection ON crm_sync_log(connection_id);
CREATE INDEX idx_crm_sync_log_contact ON crm_sync_log(contact_id);
CREATE INDEX idx_crm_sync_log_workspace ON crm_sync_log(workspace_id, synced_at DESC);

COMMIT;
