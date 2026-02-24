-- Migration: Room Curation & Invitation Campaign System
-- Description: Add capacity management, campaigns, invitations, and email tracking
-- Date: 2026-02-13

-- =====================================================
-- 1. UPDATE EVENTS TABLE (Capacity Management)
-- =====================================================

-- Create seating format enum FIRST
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seating_format') THEN
        CREATE TYPE seating_format AS ENUM ('STANDING', 'SEATED', 'MIXED');
    END IF;
END $$;

-- Add capacity and seating configuration
ALTER TABLE events
ADD COLUMN IF NOT EXISTS total_capacity INTEGER,
ADD COLUMN IF NOT EXISTS seating_format seating_format DEFAULT 'STANDING',
ADD COLUMN IF NOT EXISTS tables_config JSONB;

COMMENT ON COLUMN events.total_capacity IS 'Maximum number of attendees';
COMMENT ON COLUMN events.seating_format IS 'Event format: STANDING, SEATED, or MIXED';
COMMENT ON COLUMN events.tables_config IS 'Table configuration for seated events - JSON array of {number, seats}';

-- =====================================================
-- 2. INVITATION CAMPAIGNS TABLE
-- =====================================================

-- Create campaign status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE campaign_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
    END IF;
END $$;

-- Create campaigns table
CREATE TABLE IF NOT EXISTS invitation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status campaign_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Email template customization
  email_subject VARCHAR(200),
  email_body TEXT,

  -- Campaign statistics (denormalized for performance)
  total_considering INTEGER DEFAULT 0,
  total_invited INTEGER DEFAULT 0,
  total_accepted INTEGER DEFAULT 0,
  total_declined INTEGER DEFAULT 0,
  total_joined INTEGER DEFAULT 0,

  CONSTRAINT fk_campaign_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_event_id ON invitation_campaigns(event_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON invitation_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON invitation_campaigns(created_at DESC);

COMMENT ON TABLE invitation_campaigns IS 'Invitation campaigns for events - manages guest lists and invitation waves';
COMMENT ON COLUMN invitation_campaigns.total_considering IS 'Count of guests in CONSIDERING status';
COMMENT ON COLUMN invitation_campaigns.total_invited IS 'Count of guests who have been sent RSVP invitations';
COMMENT ON COLUMN invitation_campaigns.total_accepted IS 'Count of guests who accepted RSVP';
COMMENT ON COLUMN invitation_campaigns.total_declined IS 'Count of guests who declined RSVP';
COMMENT ON COLUMN invitation_campaigns.total_joined IS 'Count of guests who completed join request (app access)';

-- =====================================================
-- 3. CAMPAIGN INVITATIONS TABLE (Guest Pipeline)
-- =====================================================

-- Create invitation status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
        CREATE TYPE invitation_status AS ENUM (
            'CONSIDERING',  -- In guest list, not yet invited
            'INVITED',      -- RSVP email sent
            'ACCEPTED',     -- Guest accepted RSVP
            'DECLINED',     -- Guest declined RSVP
            'WAITLIST',     -- Moved to waitlist
            'BOUNCED',      -- Email bounced
            'FAILED'        -- Email send failed
        );
    END IF;
END $$;

-- Create tier enum (invitation wave order)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_tier') THEN
        CREATE TYPE invitation_tier AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'WAITLIST');
    END IF;
END $$;

-- Create priority enum (guest importance)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_priority') THEN
        CREATE TYPE invitation_priority AS ENUM ('VIP', 'HIGH', 'NORMAL', 'LOW');
    END IF;
END $$;

-- Create invitations table
CREATE TABLE IF NOT EXISTS campaign_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES invitation_campaigns(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Guest details
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,

  -- Pipeline tracking
  status invitation_status NOT NULL DEFAULT 'CONSIDERING',
  tier invitation_tier NOT NULL DEFAULT 'TIER_2',
  priority invitation_priority NOT NULL DEFAULT 'NORMAL',

  -- Host notes and planning
  internal_notes TEXT,
  expected_plus_ones INTEGER DEFAULT 0,

  -- RSVP tracking (Step 1: Attendance Confirmation)
  invitation_token VARCHAR(64) UNIQUE,
  token_expires_at TIMESTAMPTZ,
  rsvp_email_sent_at TIMESTAMPTZ,
  rsvp_responded_at TIMESTAMPTZ,
  rsvp_response_message TEXT,

  -- Join Request tracking (Step 2: App Access)
  join_token VARCHAR(64) UNIQUE,
  join_link_sent_at TIMESTAMPTZ,
  join_completed_at TIMESTAMPTZ,
  join_request_id UUID REFERENCES event_join_requests(id),

  -- Table assignment (Phase 3 - Future)
  table_assignment INTEGER,
  seat_assignment INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_invitation_campaign FOREIGN KEY (campaign_id) REFERENCES invitation_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitation_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitation_join_request FOREIGN KEY (join_request_id) REFERENCES event_join_requests(id),
  CONSTRAINT unique_campaign_email UNIQUE (campaign_id, email),
  CONSTRAINT check_expected_plus_ones CHECK (expected_plus_ones >= 0)
);

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_campaign_id ON campaign_invitations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invitations_event_id ON campaign_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON campaign_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_tier ON campaign_invitations(tier);
CREATE INDEX IF NOT EXISTS idx_invitations_priority ON campaign_invitations(priority);
CREATE INDEX IF NOT EXISTS idx_invitations_invitation_token ON campaign_invitations(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_join_token ON campaign_invitations(join_token) WHERE join_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_email ON campaign_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_join_request_id ON campaign_invitations(join_request_id) WHERE join_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON campaign_invitations(created_at DESC);

COMMENT ON TABLE campaign_invitations IS 'Individual guest invitations within campaigns - tracks full pipeline from consideration to app access';
COMMENT ON COLUMN campaign_invitations.status IS 'Current status in the invitation pipeline';
COMMENT ON COLUMN campaign_invitations.tier IS 'Invitation wave (TIER_1 = first wave, TIER_3 = last wave)';
COMMENT ON COLUMN campaign_invitations.priority IS 'Guest importance (VIP = must-have, LOW = optional)';
COMMENT ON COLUMN campaign_invitations.invitation_token IS 'Unique token for RSVP link (Step 1)';
COMMENT ON COLUMN campaign_invitations.join_token IS 'Unique token for join link (Step 2)';
COMMENT ON COLUMN campaign_invitations.expected_plus_ones IS 'Number of plus-ones guest indicated they will bring';

-- =====================================================
-- 4. EMAIL SEND LOG TABLE (Audit Trail)
-- =====================================================

-- Create email send status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_send_status') THEN
        CREATE TYPE email_send_status AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED');
    END IF;
END $$;

-- Create email log table
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES campaign_invitations(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES invitation_campaigns(id) ON DELETE SET NULL,

  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  email_type VARCHAR(50), -- 'RSVP_INVITATION' | 'JOIN_LINK'

  status email_send_status NOT NULL DEFAULT 'QUEUED',
  error_message TEXT,

  -- Email service tracking (Resend)
  email_service_id VARCHAR(255),
  email_service_response JSONB,

  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_email_log_invitation FOREIGN KEY (invitation_id) REFERENCES campaign_invitations(id) ON DELETE SET NULL,
  CONSTRAINT fk_email_log_campaign FOREIGN KEY (campaign_id) REFERENCES invitation_campaigns(id) ON DELETE SET NULL
);

-- Indexes for email log
CREATE INDEX IF NOT EXISTS idx_email_log_invitation_id ON email_send_log(invitation_id);
CREATE INDEX IF NOT EXISTS idx_email_log_campaign_id ON email_send_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_send_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_email_type ON email_send_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient_email ON email_send_log(recipient_email);

COMMENT ON TABLE email_send_log IS 'Audit log for all email sends - tracks delivery status and errors';
COMMENT ON COLUMN email_send_log.email_type IS 'Type of email: RSVP_INVITATION or JOIN_LINK';
COMMENT ON COLUMN email_send_log.email_service_id IS 'Resend message ID for tracking';

-- =====================================================
-- 5. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invitation_campaigns
DROP TRIGGER IF EXISTS update_invitation_campaigns_updated_at ON invitation_campaigns;
CREATE TRIGGER update_invitation_campaigns_updated_at
    BEFORE UPDATE ON invitation_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for campaign_invitations
DROP TRIGGER IF EXISTS update_campaign_invitations_updated_at ON campaign_invitations;
CREATE TRIGGER update_campaign_invitations_updated_at
    BEFORE UPDATE ON campaign_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. TRIGGERS FOR CAMPAIGN STATISTICS
-- =====================================================

-- Function to update campaign statistics when invitation status changes
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrement old status count (on UPDATE)
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        UPDATE invitation_campaigns
        SET
            total_considering = total_considering - CASE WHEN OLD.status = 'CONSIDERING' THEN 1 ELSE 0 END,
            total_invited = total_invited - CASE WHEN OLD.status = 'INVITED' THEN 1 ELSE 0 END,
            total_accepted = total_accepted - CASE WHEN OLD.status = 'ACCEPTED' THEN 1 ELSE 0 END,
            total_declined = total_declined - CASE WHEN OLD.status = 'DECLINED' THEN 1 ELSE 0 END
        WHERE id = OLD.campaign_id;
    END IF;

    -- Increment new status count (on INSERT or UPDATE)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        UPDATE invitation_campaigns
        SET
            total_considering = total_considering + CASE WHEN NEW.status = 'CONSIDERING' THEN 1 ELSE 0 END,
            total_invited = total_invited + CASE WHEN NEW.status = 'INVITED' THEN 1 ELSE 0 END,
            total_accepted = total_accepted + CASE WHEN NEW.status = 'ACCEPTED' THEN 1 ELSE 0 END,
            total_declined = total_declined + CASE WHEN NEW.status = 'DECLINED' THEN 1 ELSE 0 END
        WHERE id = NEW.campaign_id;
    END IF;

    -- Update total_joined when join is completed
    IF TG_OP = 'UPDATE' AND OLD.join_completed_at IS NULL AND NEW.join_completed_at IS NOT NULL THEN
        UPDATE invitation_campaigns
        SET total_joined = total_joined + 1
        WHERE id = NEW.campaign_id;
    END IF;

    -- Decrement counts on DELETE
    IF TG_OP = 'DELETE' THEN
        UPDATE invitation_campaigns
        SET
            total_considering = total_considering - CASE WHEN OLD.status = 'CONSIDERING' THEN 1 ELSE 0 END,
            total_invited = total_invited - CASE WHEN OLD.status = 'INVITED' THEN 1 ELSE 0 END,
            total_accepted = total_accepted - CASE WHEN OLD.status = 'ACCEPTED' THEN 1 ELSE 0 END,
            total_declined = total_declined - CASE WHEN OLD.status = 'DECLINED' THEN 1 ELSE 0 END,
            total_joined = total_joined - CASE WHEN OLD.join_completed_at IS NOT NULL THEN 1 ELSE 0 END
        WHERE id = OLD.campaign_id;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for campaign stats
DROP TRIGGER IF EXISTS update_campaign_stats_trigger ON campaign_invitations;
CREATE TRIGGER update_campaign_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON campaign_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_stats();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE 'Migration 001 complete. Created tables:';
    RAISE NOTICE '  - invitation_campaigns';
    RAISE NOTICE '  - campaign_invitations';
    RAISE NOTICE '  - email_send_log';
    RAISE NOTICE 'Updated tables:';
    RAISE NOTICE '  - events (added capacity columns)';
END $$;
