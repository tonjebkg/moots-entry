/**
 * Scoring & Enrichment types for AI Intelligence Engine (Layers 2 & 3)
 */

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface EventObjective {
  id: string;
  event_id: number;
  workspace_id: string;
  objective_text: string;
  weight: number;
  criteria_config: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MatchedObjective {
  objective_id: string;
  objective_text: string;
  match_score: number; // 0-100
  explanation: string;
}

export interface GuestScore {
  id: string;
  contact_id: string;
  event_id: number;
  workspace_id: string;
  relevance_score: number; // 0-100
  matched_objectives: MatchedObjective[];
  score_rationale: string | null;
  talking_points: string[];
  scored_at: string;
  model_version: string | null;
}

/** Contact with its score for a specific event */
export interface ScoredContact {
  contact_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  company: string | null;
  title: string | null;
  emails: unknown[];
  tags: string[];
  enrichment_status: string;
  ai_summary: string | null;

  // Score fields
  score_id: string | null;
  relevance_score: number | null;
  matched_objectives: MatchedObjective[] | null;
  score_rationale: string | null;
  talking_points: string[] | null;
  scored_at: string | null;
  model_version: string | null;
}

export interface ScoringJob {
  id: string;
  event_id: number;
  workspace_id: string;
  status: JobStatus;
  total_contacts: number;
  completed_count: number;
  failed_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface EnrichmentJob {
  id: string;
  workspace_id: string;
  status: JobStatus;
  total_contacts: number;
  completed_count: number;
  failed_count: number;
  error_message: string | null;
  contact_ids: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
