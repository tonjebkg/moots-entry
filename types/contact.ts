/**
 * Contact types for the People Database (Layer 1)
 */

export type EnrichmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'STALE';
export type ContactSource = 'MANUAL' | 'CSV_IMPORT' | 'EVENT_IMPORT' | 'API' | 'ENRICHMENT';

export interface ContactEmail {
  email: string;
  type?: 'work' | 'personal' | 'other';
  primary?: boolean;
}

export interface ContactPhone {
  phone: string;
  type?: 'mobile' | 'work' | 'home' | 'other';
  primary?: boolean;
}

export interface EventHistoryEntry {
  event_id: number;
  event_title: string;
  role: string; // 'invited', 'attended', 'speaker', 'sponsor'
  date: string;
  score?: number;
}

export interface Contact {
  id: string;
  workspace_id: string;

  full_name: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;

  emails: ContactEmail[];
  phones: ContactPhone[];

  company: string | null;
  title: string | null;
  role_seniority: string | null;
  industry: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;

  net_worth_range: string | null;
  board_affiliations: string[];

  enrichment_data: Record<string, unknown>;
  enrichment_status: EnrichmentStatus;
  enriched_at: string | null;
  enrichment_cost_cents: number;
  ai_summary: string | null;

  tags: string[];
  internal_notes: string | null;
  source: ContactSource;
  source_detail: string | null;

  event_history: EventHistoryEntry[];

  dedup_key: string | null;

  created_at: string;
  updated_at: string;
}

/** Lightweight contact for list views */
export interface ContactListItem {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  company: string | null;
  title: string | null;
  emails: ContactEmail[];
  tags: string[];
  enrichment_status: EnrichmentStatus;
  source: ContactSource;
  created_at: string;
  updated_at: string;
}
