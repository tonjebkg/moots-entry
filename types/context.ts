/**
 * Types for the unified context layer (Phase 2: Deepen the Context).
 * Used by all AI operations — scoring, seating, briefings, follow-up, chat.
 */

export interface CompanyProfile {
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  market_position: string | null;
  key_leadership: { name: string; title: string }[];
  strategic_priorities: string[];
  competitors: string[];
  brand_voice: string | null;
  enriched_at: string | null;
}

export interface EventContext {
  id: number;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  total_capacity: number | null;
  seating_format: string | null;
  status: string | null;
  event_theme: string | null;
  success_criteria: string | null;
  key_stakeholders: { name: string; role?: string }[];
  budget_range: string | null;
  additional_context: string | null;
}

export interface SponsorContext {
  name: string;
  tier: string | null;
  description: string | null;
  goals: string[];
  promised_seats: number | null;
  table_preference: string | null;
  key_attendees: { name: string; title?: string }[];
  contact_person: string | null;
}

export interface ObjectiveContext {
  objective_text: string;
  weight: number;
}

export interface GuestSummary {
  total_invited: number;
  scored: number;
  qualified: number;
  confirmed: number;
  pending_rsvp: number;
  declined: number;
  avg_score: number | null;
  top_score: number | null;
}

export interface LearnedPreference {
  category: string;
  preference_text: string;
  confidence: number;
  observation_count: number;
}

export interface FullEventContext {
  company: CompanyProfile;
  event: EventContext;
  objectives: ObjectiveContext[];
  sponsors: SponsorContext[];
  guests: GuestSummary;
  preferences?: LearnedPreference[];
}
