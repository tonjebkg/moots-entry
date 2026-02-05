-- Migration: Add defaults for visibility_enabled and notifications_enabled
-- Date: 2026-01-29
-- Purpose: Fix NOT NULL constraint violations on join request creation
--
-- Issue: visibility_enabled and notifications_enabled are NOT NULL but have no defaults,
--        causing POST /api/events/[eventId]/join-requests to fail with:
--        "null value in column 'visibility_enabled' violates not-null constraint"
--
-- Solution: Add sensible defaults (both TRUE) so all INSERTs succeed without
--           explicitly providing these columns.

-- Add defaults for NOT NULL boolean columns
ALTER TABLE event_join_requests
ALTER COLUMN visibility_enabled SET DEFAULT true,
ALTER COLUMN notifications_enabled SET DEFAULT true;

-- Backfill any existing NULL values (shouldn't be any due to NOT NULL constraint,
-- but include for completeness)
UPDATE event_join_requests
SET visibility_enabled = true
WHERE visibility_enabled IS NULL;

UPDATE event_join_requests
SET notifications_enabled = true
WHERE notifications_enabled IS NULL;
