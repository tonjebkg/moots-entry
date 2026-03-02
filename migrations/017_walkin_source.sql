-- Migration 017: Add WALK_IN to contact_source enum
-- Walk-in guests now create people_contacts records for persistent intelligence.

ALTER TYPE contact_source ADD VALUE IF NOT EXISTS 'WALK_IN';
