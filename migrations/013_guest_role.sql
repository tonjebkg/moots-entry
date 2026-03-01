-- Migration 013: Add guest_role column to people_contacts
-- Role values: TIER_1, TIER_2, TIER_3, TEAM_MEMBER, PARTNER, CO_HOST, SPEAKER, TALENT, VIP
-- This replaces the scattered VIP tag / tier badge approach with a single explicit role field.

BEGIN;

ALTER TABLE people_contacts
  ADD COLUMN IF NOT EXISTS guest_role TEXT;

CREATE INDEX IF NOT EXISTS idx_people_contacts_guest_role
  ON people_contacts(guest_role) WHERE guest_role IS NOT NULL;

COMMIT;
