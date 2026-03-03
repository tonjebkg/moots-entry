-- =============================================================================
-- Migration 018: Add missing event detail fields for Context tab
-- Adds hosting_company, dress_code, description, event_goal to events table
-- =============================================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hosting_company TEXT,
  ADD COLUMN IF NOT EXISTS dress_code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS event_goal TEXT;
