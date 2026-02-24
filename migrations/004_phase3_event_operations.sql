-- Migration 004: Phase 3 — Event Operations
-- Tables: event_checkins, guest_team_assignments, briefing_packets,
--         rsvp_pages, rsvp_submissions, broadcast_messages, follow_up_sequences
-- Also: ALTER campaign_invitations for check-in columns

BEGIN;

-- ─── New Enums ─────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE briefing_type AS ENUM ('MORNING', 'END_OF_DAY', 'PRE_EVENT', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE briefing_status AS ENUM ('GENERATING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_status AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE follow_up_status AS ENUM ('PENDING', 'SENT', 'OPENED', 'REPLIED', 'MEETING_BOOKED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE checkin_source AS ENUM ('INVITATION', 'WALK_IN', 'QR_SCAN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 1. event_checkins ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Guest identity (at least one must be set)
  contact_id    UUID REFERENCES people_contacts(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES campaign_invitations(id) ON DELETE SET NULL,

  -- Walk-in fields (when no existing contact/invitation)
  full_name     TEXT NOT NULL,
  email         TEXT,
  company       TEXT,
  title         TEXT,
  phone         TEXT,

  source        checkin_source NOT NULL DEFAULT 'INVITATION',
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_workspace ON event_checkins(workspace_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_contact ON event_checkins(contact_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_email ON event_checkins(email);
CREATE INDEX IF NOT EXISTS idx_event_checkins_created ON event_checkins(created_at);

-- ─── 2. guest_team_assignments ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guest_team_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES people_contacts(id) ON DELETE CASCADE,
  assigned_to   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'PRIMARY',
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(event_id, contact_id, assigned_to)
);

CREATE INDEX IF NOT EXISTS idx_team_assignments_event ON guest_team_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_workspace ON guest_team_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_contact ON guest_team_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_user ON guest_team_assignments(assigned_to);

-- ─── 3. briefing_packets ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS briefing_packets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  generated_for UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  briefing_type briefing_type NOT NULL DEFAULT 'PRE_EVENT',
  status        briefing_status NOT NULL DEFAULT 'GENERATING',
  title         TEXT NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  guest_count   INTEGER NOT NULL DEFAULT 0,
  model_version TEXT,
  error_message TEXT,

  generated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefing_packets_event ON briefing_packets(event_id);
CREATE INDEX IF NOT EXISTS idx_briefing_packets_workspace ON briefing_packets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_briefing_packets_user ON briefing_packets(generated_for);
CREATE INDEX IF NOT EXISTS idx_briefing_packets_type ON briefing_packets(briefing_type);

-- ─── 4. rsvp_pages ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rsvp_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  slug          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  access_code   TEXT,

  -- Branding
  headline      TEXT NOT NULL DEFAULT 'You''re Invited',
  description   TEXT,
  hero_image_url TEXT,
  accent_color  TEXT DEFAULT '#B8755E',
  show_location BOOLEAN DEFAULT TRUE,
  show_date     BOOLEAN DEFAULT TRUE,
  show_capacity BOOLEAN DEFAULT FALSE,

  -- Custom fields beyond name/email
  custom_fields JSONB DEFAULT '[]',

  -- Limits
  max_submissions INTEGER,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvp_pages_slug ON rsvp_pages(slug);
CREATE INDEX IF NOT EXISTS idx_rsvp_pages_event ON rsvp_pages(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_pages_workspace ON rsvp_pages(workspace_id);

-- ─── 5. rsvp_submissions ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rsvp_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_page_id  UUID NOT NULL REFERENCES rsvp_pages(id) ON DELETE CASCADE,
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  company       TEXT,
  title         TEXT,
  phone         TEXT,
  plus_ones     INTEGER DEFAULT 0,
  custom_responses JSONB DEFAULT '{}',
  notes         TEXT,

  -- Resolved to a contact if matched
  contact_id    UUID REFERENCES people_contacts(id) ON DELETE SET NULL,

  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_submissions_page ON rsvp_submissions(rsvp_page_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_submissions_event ON rsvp_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_submissions_workspace ON rsvp_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_submissions_email ON rsvp_submissions(email);

-- ─── 6. broadcast_messages ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS broadcast_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  subject       TEXT NOT NULL,
  content       TEXT NOT NULL,
  status        broadcast_status NOT NULL DEFAULT 'DRAFT',

  -- Targeting
  recipient_filter JSONB DEFAULT '{}',
  recipient_count  INTEGER DEFAULT 0,

  -- Scheduling
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,

  -- Delivery stats
  delivered_count INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,
  opened_count    INTEGER DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_event ON broadcast_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_workspace ON broadcast_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status);

-- ─── 7. follow_up_sequences ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES people_contacts(id) ON DELETE CASCADE,

  status        follow_up_status NOT NULL DEFAULT 'PENDING',
  subject       TEXT NOT NULL,
  content       TEXT NOT NULL,
  personalization_context JSONB DEFAULT '{}',

  -- AI generation metadata
  model_version TEXT,
  generated_at  TIMESTAMPTZ,

  -- Delivery tracking
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  replied_at    TIMESTAMPTZ,
  meeting_booked_at TIMESTAMPTZ,

  -- Resend tracking
  email_service_id TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(event_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_up_event ON follow_up_sequences(event_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_workspace ON follow_up_sequences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_contact ON follow_up_sequences(contact_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_sequences(status);

-- ─── ALTER campaign_invitations for check-in tracking ──────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_invitations' AND column_name = 'checked_in'
  ) THEN
    ALTER TABLE campaign_invitations ADD COLUMN checked_in BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_invitations' AND column_name = 'checked_in_at'
  ) THEN
    ALTER TABLE campaign_invitations ADD COLUMN checked_in_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─── Auto-update triggers ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'event_checkins',
      'guest_team_assignments',
      'briefing_packets',
      'rsvp_pages',
      'broadcast_messages',
      'follow_up_sequences'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trigger_update_%I ON %I; CREATE TRIGGER trigger_update_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

COMMIT;
