-- Migration: Add ops dashboard fields to event_join_requests
-- Date: 2026-01-27
-- Purpose: Enable Phase 1 parity - track plus_ones and ops comments

ALTER TABLE event_join_requests
ADD COLUMN IF NOT EXISTS plus_ones INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Update existing rows to have default values
UPDATE event_join_requests
SET plus_ones = 0
WHERE plus_ones IS NULL;
