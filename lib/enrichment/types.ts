/**
 * Pluggable enrichment provider interface.
 *
 * v1 uses Claude AI search as the sole provider (see lib/enrichment/claude-provider.ts).
 * To add future providers (Apollo, Clearbit, WealthX):
 *
 * 1. Create a new file, e.g. `lib/enrichment/apollo-provider.ts`
 * 2. Implement the `EnrichmentProvider` interface:
 *
 *    import type { EnrichmentProvider, EnrichmentInput, EnrichmentResult } from './types';
 *
 *    export const apolloProvider: EnrichmentProvider = {
 *      name: 'apollo',
 *      async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
 *        // Call Apollo API with input.full_name, input.emails, etc.
 *        // Return enriched data following EnrichmentResult shape
 *      },
 *    };
 *
 * 3. Pass the provider to `runEnrichmentPipeline()` in your API route.
 *
 * Chain multiple providers by running them in sequence and merging results.
 * Each provider returns cost_cents for budget tracking.
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
