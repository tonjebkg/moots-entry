/**
 * Guest Profile - Complete guest intelligence model for Moots
 *
 * Supports enrichment from multiple sources:
 * - LinkedIn/Coresignal API
 * - Salesforce CRM
 * - Airtable/Notion integrations
 * - AI agents (Claude, GPT, etc.)
 * - MCP (Model Context Protocol) servers
 * - Custom integrations
 */

export type GuestTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'WAITLIST'
export type GuestPriority = 'VIP' | 'HIGH' | 'NORMAL' | 'LOW'
export type GuestStatus = 'CONSIDERING' | 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'BOUNCED' | 'FAILED'

/**
 * Enrichment Source - Track where guest data came from
 *
 * This flexible structure supports any integration without schema changes.
 */
export interface EnrichmentSource {
  source: string // e.g., 'linkedin', 'salesforce', 'airtable', 'notion', 'ai-agent', 'coresignal', 'mcp-server'
  enriched_at: string // ISO timestamp
  enriched_fields?: string[] // Which fields were enriched (e.g., ['title', 'company', 'profile_picture_url'])
  confidence?: number // 0-1 score for AI-sourced data
  metadata?: Record<string, any> // Source-specific data (API response, agent reasoning, etc.)
}

export interface GuestProfile {
  // Identity
  id: string
  event_id: number
  campaign_id?: string

  // Structured Name (NOT "full_name")
  first_name: string
  last_name: string

  // Professional Identity
  company: string
  title?: string
  linkedin_url?: string

  // Profile
  profile_picture_url?: string
  email: string
  phone?: string

  // Event Context
  tier: GuestTier
  priority: GuestPriority
  status: GuestStatus

  // Curation Intelligence
  introduction_source?: string // Who introduced them (e.g., "Sarah Chen, Partner")
  host_notes?: string // Why they matter for this event
  tags?: string[] // e.g., ["Portfolio CEO", "Key Account", "Board Member"]

  // Enrichment Tracking (flexible for multiple sources)
  enrichment_sources?: EnrichmentSource[]
  last_enriched_at?: string

  // Event Participation
  expected_plus_ones: number
  actual_plus_ones?: number
  checked_in?: boolean
  checked_in_at?: string

  // Communication
  rsvp_email_sent_at?: string | null
  rsvp_responded_at?: string | null
  join_link_sent_at?: string | null
  join_completed_at?: string | null

  // History (for future multi-event tracking)
  past_events?: number[] // Event IDs they attended
  introduction_count?: number // How many people they introduced

  // Internal Notes
  internal_notes?: string // Operational notes (different from host_notes)

  // Timestamps
  invited_at?: string
  created_at: string
  updated_at: string
}

/**
 * Display helpers
 */
export function getFullName(guest: Pick<GuestProfile, 'first_name' | 'last_name'>): string {
  return `${guest.first_name} ${guest.last_name}`.trim()
}

export function getDisplayTitle(guest: Pick<GuestProfile, 'title' | 'company'>): string {
  if (guest.title && guest.company) {
    return `${guest.title} @ ${guest.company}`
  }
  if (guest.title) return guest.title
  if (guest.company) return guest.company
  return ''
}

export function isEnriched(guest: Pick<GuestProfile, 'enrichment_sources'>): boolean {
  return !!(guest.enrichment_sources && guest.enrichment_sources.length > 0)
}

export function getEnrichmentSources(guest: Pick<GuestProfile, 'enrichment_sources'>): string[] {
  if (!guest.enrichment_sources) return []
  return guest.enrichment_sources.map(e => e.source)
}

export function hasEnrichmentFrom(guest: Pick<GuestProfile, 'enrichment_sources'>, source: string): boolean {
  return getEnrichmentSources(guest).includes(source)
}

export function getLatestEnrichment(guest: Pick<GuestProfile, 'enrichment_sources'>): EnrichmentSource | null {
  if (!guest.enrichment_sources || guest.enrichment_sources.length === 0) return null
  return guest.enrichment_sources.reduce((latest, current) =>
    new Date(current.enriched_at) > new Date(latest.enriched_at) ? current : latest
  )
}

/**
 * Tier metadata
 */
export const TIER_META = {
  TIER_1: { label: 'Tier 1', description: 'First Wave (VIP)', color: 'purple' },
  TIER_2: { label: 'Tier 2', description: 'Second Wave', color: 'blue' },
  TIER_3: { label: 'Tier 3', description: 'Third Wave', color: 'gray' },
  WAITLIST: { label: 'Waitlist', description: 'Holding', color: 'amber' },
} as const

/**
 * Priority metadata
 */
export const PRIORITY_META = {
  VIP: { label: 'VIP', color: 'purple' },
  HIGH: { label: 'High', color: 'blue' },
  NORMAL: { label: 'Normal', color: 'gray' },
  LOW: { label: 'Low', color: 'slate' },
} as const

/**
 * Status metadata
 */
export const STATUS_META = {
  CONSIDERING: { label: 'Considering', color: 'gray' },
  INVITED: { label: 'Invited', color: 'blue' },
  ACCEPTED: { label: 'Accepted', color: 'green' },
  DECLINED: { label: 'Declined', color: 'red' },
  CANCELLED: { label: 'Cancelled', color: 'slate' },
  BOUNCED: { label: 'Bounced', color: 'red' },
  FAILED: { label: 'Failed', color: 'red' },
} as const
