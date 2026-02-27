-- Add AI interpretation and qualifying count to event_objectives
ALTER TABLE event_objectives ADD COLUMN IF NOT EXISTS ai_interpretation TEXT;
ALTER TABLE event_objectives ADD COLUMN IF NOT EXISTS qualifying_count INTEGER DEFAULT 0;
ALTER TABLE event_objectives ADD COLUMN IF NOT EXISTS ai_questions JSONB DEFAULT '[]';
