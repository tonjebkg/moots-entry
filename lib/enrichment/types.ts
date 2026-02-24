/**
 * Pluggable enrichment provider interface.
 * Allows swapping in LinkedIn, Apollo, Clearbit, WealthX, etc. later.
 */

export interface EnrichmentInput {
  full_name: string;
  emails: { email: string }[];
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
}

export interface EnrichmentResult {
  success: boolean;
  provider: string;

  // Enriched fields
  title?: string;
  company?: string;
  industry?: string;
  role_seniority?: string;
  linkedin_url?: string;
  twitter_url?: string;
  net_worth_range?: string;
  board_affiliations?: string[];
  ai_summary?: string;

  // Raw enrichment data blob
  raw_data?: Record<string, unknown>;

  // Cost tracking
  cost_cents?: number;
  error?: string;
}

export interface EnrichmentProvider {
  name: string;
  enrich(input: EnrichmentInput): Promise<EnrichmentResult>;
}
