-- Migration 007: Add RSVP_SUBMISSION and JOIN_REQUEST to contact_source enum
-- These source types track contacts auto-created from inbound RSVP submissions
-- and mobile app join requests, enabling source-based filtering in Guest Intelligence.

ALTER TYPE contact_source ADD VALUE IF NOT EXISTS 'RSVP_SUBMISSION';
ALTER TYPE contact_source ADD VALUE IF NOT EXISTS 'JOIN_REQUEST';
