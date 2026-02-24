// ─── Phase 4: Integrations & Analytics Types ─────────────────────────────

// ─── Enums ───────────────────────────────────────────────────────────────

export type CrmProvider = 'SALESFORCE' | 'HUBSPOT';
export type CrmSyncDirection = 'PUSH' | 'PULL' | 'BIDIRECTIONAL';
export type CrmSyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

// ─── Seating ─────────────────────────────────────────────────────────────

export interface SeatingSuggestion {
  id: string;
  event_id: number;
  workspace_id: string;
  contact_id: string;
  table_number: number;
  seat_number: number | null;
  rationale: string | null;
  confidence: number | null;
  batch_id: string;
  model_version: string | null;
  created_at: string;
  // Joined fields
  contact_name?: string;
  contact_company?: string;
  contact_title?: string;
  relevance_score?: number | null;
}

export interface IntroductionPairing {
  id: string;
  event_id: number;
  workspace_id: string;
  contact_a_id: string;
  contact_b_id: string;
  reason: string;
  mutual_interest: string | null;
  priority: number;
  batch_id: string;
  model_version: string | null;
  created_at: string;
  // Joined fields
  contact_a_name?: string;
  contact_a_company?: string;
  contact_b_name?: string;
  contact_b_company?: string;
}

export interface SeatingPlan {
  tables: {
    table_number: number;
    seats: number;
    assignments: {
      contact_id: string;
      contact_name: string;
      contact_company: string | null;
      seat_number: number | null;
      rationale: string | null;
      relevance_score: number | null;
    }[];
  }[];
  unassigned: {
    contact_id: string;
    contact_name: string;
    contact_company: string | null;
    relevance_score: number | null;
  }[];
  batch_id: string;
  generated_at: string;
}

// ─── CRM ─────────────────────────────────────────────────────────────────

export interface CrmConnection {
  id: string;
  workspace_id: string;
  provider: CrmProvider;
  name: string;
  credentials: Record<string, unknown>;
  field_mapping: CrmFieldMapping;
  sync_direction: CrmSyncDirection;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  created_by_name?: string;
}

export interface CrmFieldMapping {
  contact_fields: { moots_field: string; crm_field: string }[];
  follow_up_fields?: { moots_field: string; crm_field: string }[];
}

export interface CrmSyncEntry {
  id: string;
  connection_id: string;
  workspace_id: string;
  contact_id: string | null;
  entity_type: string;
  entity_id: string;
  direction: CrmSyncDirection;
  status: CrmSyncStatus;
  crm_record_id: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  synced_at: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface AnalyticsMetrics {
  funnel: FunnelStage[];
  headline: {
    guest_pool: number;
    scored: number;
    invited: number;
    accepted: number;
    checked_in: number;
    walk_ins: number;
    follow_ups_sent: number;
    meetings_booked: number;
    broadcasts_sent: number;
  };
  score_distribution: {
    range: string;
    count: number;
  }[];
  campaign_summary: {
    campaign_id: string;
    campaign_name: string;
    total_invited: number;
    total_accepted: number;
    total_declined: number;
    acceptance_rate: number;
  }[];
}

export interface TeamPerformance {
  user_id: string;
  user_name: string;
  user_email: string;
  assigned_guests: number;
  checked_in_guests: number;
  follow_ups_sent: number;
  meetings_booked: number;
}

export interface EventComparison {
  event_id: number;
  event_title: string;
  metrics: {
    invited: number;
    accepted: number;
    checked_in: number;
    acceptance_rate: number;
    checkin_rate: number;
    follow_up_rate: number;
  };
}
