-- Migration 014: Split guest_role into role + priority
-- Adds guest_priority column and migrates tier/VIP values from guest_role

-- Add guest_priority column
ALTER TABLE people_contacts ADD COLUMN IF NOT EXISTS guest_priority TEXT;

-- Migrate tier/VIP values from guest_role to guest_priority
UPDATE people_contacts SET guest_priority = guest_role WHERE guest_role IN ('TIER_1', 'TIER_2', 'TIER_3', 'VIP');

-- Clear migrated values from guest_role (they belong in priority now)
UPDATE people_contacts SET guest_role = NULL WHERE guest_role IN ('TIER_1', 'TIER_2', 'TIER_3', 'VIP');

-- Add index for priority lookups
CREATE INDEX IF NOT EXISTS idx_contacts_guest_priority ON people_contacts(guest_priority) WHERE guest_priority IS NOT NULL;
