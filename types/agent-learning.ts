/**
 * Types for the agent learning system (Phase 3: Close the Agent Loop).
 * Used by preference extraction, override analysis, and proactive suggestions.
 */

export interface AgentPreference {
  id: string;
  workspace_id: string;
  category: 'seating' | 'scoring' | 'follow_up' | 'general';
  preference_key: string;
  preference_text: string;
  confidence: number;
  observation_count: number;
  last_observed: string;
  created_at: string;
}

export interface OverrideAnalysis {
  analysis: string;
  suggestion: string | null;
  override_id: string;
}

export interface ProactiveSuggestion {
  type:
    | 'uninvited_high_scorers'
    | 'competitor_conflict'
    | 'stale_follow_ups'
    | 'unscored_contacts'
    | 'pending_invitations';
  headline: string;
  detail: string;
  event_id: number;
  metadata: Record<string, unknown>;
}

export interface MoveAnalysisRequest {
  contact_id: string;
  from_table: number;
  to_table: number;
}

export interface MoveAnalysisResponse {
  analysis: string;
  suggestion: string | null;
  override_id: string;
}
