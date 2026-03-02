-- Migration 015: Context tab tables
-- Supports document uploads, reference links, AI activity feed, and generated context

-- Event documents uploaded for AI analysis
CREATE TABLE IF NOT EXISTS event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID,
  name VARCHAR(500) NOT NULL,
  size_bytes BIGINT,
  file_type VARCHAR(20),
  blob_url TEXT,
  status VARCHAR(20) DEFAULT 'queued',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_documents_event_id ON event_documents(event_id);

-- Reference links added by host
CREATE TABLE IF NOT EXISTS event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID,
  url TEXT NOT NULL,
  label VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_links_event_id ON event_links(event_id);

-- AI activity feed items (timeline of AI work + user messages)
CREATE TABLE IF NOT EXISTS event_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID,
  type VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  details JSONB,
  actions JSONB,
  speakers JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_activities_event_id ON event_activities(event_id);
CREATE INDEX IF NOT EXISTS idx_event_activities_created_at ON event_activities(event_id, created_at);

-- AI-generated context (sponsors, strategic significance, market context, completeness)
CREATE TABLE IF NOT EXISTS event_generated_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id UUID,
  sponsors JSONB,
  strategic_significance TEXT,
  market_context TEXT,
  completeness JSONB,
  model_version VARCHAR(100),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_generated_context_event_id ON event_generated_context(event_id);
