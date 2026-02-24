// ─── Phase 3: Event Operations Types ─────────────────────────────────────

// ─── Enums ───────────────────────────────────────────────────────────────

export type BriefingType = 'MORNING' | 'END_OF_DAY' | 'PRE_EVENT' | 'CUSTOM';
export type BriefingStatus = 'GENERATING' | 'READY' | 'FAILED';
export type BroadcastStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
export type FollowUpStatus = 'PENDING' | 'SENT' | 'OPENED' | 'REPLIED' | 'MEETING_BOOKED' | 'FAILED';
export type CheckinSource = 'INVITATION' | 'WALK_IN' | 'QR_SCAN';

// ─── Check-in ────────────────────────────────────────────────────────────

export interface EventCheckin {
  id: string;
  event_id: number;
  workspace_id: string;
  contact_id: string | null;
  invitation_id: string | null;
  full_name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  source: CheckinSource;
  checked_in_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckinMetrics {
  total_expected: number;
  total_checked_in: number;
  walk_ins: number;
  check_in_rate: number;
  recent_checkins: EventCheckin[];
}

// ─── Guest Team Assignments ──────────────────────────────────────────────

export interface GuestTeamAssignment {
  id: string;
  event_id: number;
  workspace_id: string;
  contact_id: string;
  assigned_to: string;
  role: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_to_name?: string;
  assigned_to_email?: string;
  contact_name?: string;
}

// ─── Dossiers ────────────────────────────────────────────────────────────

export interface DossierData {
  contact_id: string;
  full_name: string;
  company: string | null;
  title: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  email: string | null;
  ai_summary: string | null;
  tags: string[];
  // Scoring data
  relevance_score: number | null;
  score_rationale: string | null;
  talking_points: string[];
  matched_objectives: {
    objective_id: string;
    objective_text: string;
    match_score: number;
    explanation: string;
  }[];
  // Team assignments
  team_assignments: GuestTeamAssignment[];
  // Enrichment
  enrichment_data: Record<string, unknown>;
  enriched_at: string | null;
}

// ─── Briefing Packets ────────────────────────────────────────────────────

export interface BriefingGuest {
  contact_id: string;
  full_name: string;
  company: string | null;
  title: string | null;
  relevance_score: number;
  talking_points: string[];
  score_rationale: string;
  key_interests: string[];
  conversation_starters: string[];
}

export interface BriefingContent {
  event_summary: string;
  key_guests: BriefingGuest[];
  strategic_notes: string;
  agenda_highlights: string[];
}

export interface BriefingPacket {
  id: string;
  event_id: number;
  workspace_id: string;
  generated_for: string;
  briefing_type: BriefingType;
  status: BriefingStatus;
  title: string;
  content: BriefingContent;
  guest_count: number;
  model_version: string | null;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  generated_for_name?: string;
  generated_for_email?: string;
}

// ─── RSVP Pages ──────────────────────────────────────────────────────────

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface RsvpPage {
  id: string;
  event_id: number;
  workspace_id: string;
  slug: string;
  is_active: boolean;
  access_code: string | null;
  headline: string;
  description: string | null;
  hero_image_url: string | null;
  accent_color: string;
  show_location: boolean;
  show_date: boolean;
  show_capacity: boolean;
  custom_fields: CustomField[];
  max_submissions: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  event_title?: string;
  submission_count?: number;
}

export interface RsvpSubmission {
  id: string;
  rsvp_page_id: string;
  event_id: number;
  workspace_id: string;
  full_name: string;
  email: string;
  company: string | null;
  title: string | null;
  phone: string | null;
  plus_ones: number;
  custom_responses: Record<string, unknown>;
  notes: string | null;
  contact_id: string | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Broadcast Messages ──────────────────────────────────────────────────

export interface BroadcastMessage {
  id: string;
  event_id: number;
  workspace_id: string;
  created_by: string;
  subject: string;
  content: string;
  status: BroadcastStatus;
  recipient_filter: Record<string, unknown>;
  recipient_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_count: number;
  failed_count: number;
  opened_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  created_by_name?: string;
}

// ─── Follow-Up Sequences ────────────────────────────────────────────────

export interface FollowUpSequence {
  id: string;
  event_id: number;
  workspace_id: string;
  contact_id: string;
  status: FollowUpStatus;
  subject: string;
  content: string;
  personalization_context: Record<string, unknown>;
  model_version: string | null;
  generated_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  meeting_booked_at: string | null;
  email_service_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact_name?: string;
  contact_email?: string;
  contact_company?: string;
}

// ─── Status Metadata ─────────────────────────────────────────────────────

export const BROADCAST_STATUS_META: Record<BroadcastStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700' },
  SENDING: { label: 'Sending', color: 'bg-yellow-50 text-yellow-700' },
  SENT: { label: 'Sent', color: 'bg-green-50 text-green-700' },
  FAILED: { label: 'Failed', color: 'bg-red-50 text-red-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
};

export const FOLLOW_UP_STATUS_META: Record<FollowUpStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: 'Sent', color: 'bg-blue-50 text-blue-700' },
  OPENED: { label: 'Opened', color: 'bg-cyan-50 text-cyan-700' },
  REPLIED: { label: 'Replied', color: 'bg-green-50 text-green-700' },
  MEETING_BOOKED: { label: 'Meeting Booked', color: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Failed', color: 'bg-red-50 text-red-700' },
};

export const BRIEFING_STATUS_META: Record<BriefingStatus, { label: string; color: string }> = {
  GENERATING: { label: 'Generating', color: 'bg-yellow-50 text-yellow-700' },
  READY: { label: 'Ready', color: 'bg-green-50 text-green-700' },
  FAILED: { label: 'Failed', color: 'bg-red-50 text-red-700' },
};
