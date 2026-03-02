/**
 * Types for the Context tab feature.
 * Covers activity feed, documents, links, generated context, and SSE streaming.
 */

export type ActivityType =
  | 'waiting'
  | 'reading'
  | 'extracted'
  | 'researching'
  | 'found'
  | 'insight'
  | 'suggestion'
  | 'user'
  | 'speaker_card'
  | 'complete';

export interface ActivityItem {
  id: string;
  eventId: string;
  type: ActivityType;
  text: string;
  timestamp: string;
  details?: string[];
  actions?: ActivityAction[];
  speakers?: SpeakerCandidate[];
  metadata?: Record<string, unknown>;
}

export interface ActivityAction {
  id: string;
  label: string;
  primary: boolean;
  actionType:
    | 'navigate_tab'
    | 'update_context'
    | 'trigger_workflow'
    | 'draft_outreach'
    | 'add_to_guest_list';
  payload?: Record<string, unknown>;
}

export interface SpeakerCandidate {
  id: string;
  name: string;
  title: string;
  relevance: number;
  avatarUrl?: string;
  pastEvents: string;
  speakingExperience: string;
  fitAnalysis: string;
  relationshipStatus: string;
}

export interface GeneratedContext {
  id: string;
  eventId: string;
  sponsors: Sponsor[];
  strategicSignificance: string;
  marketContext: string;
  completeness: CompletenessItem[];
  generatedAt: string;
  modelVersion: string;
}

export interface Sponsor {
  name: string;
  role: string;
  tier: 'Primary' | 'Gold' | 'Silver';
}

export interface CompletenessItem {
  label: string;
  done: boolean;
  source?: string;
}

export type DocumentFileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'txt';
export type DocumentStatus = 'uploading' | 'queued' | 'analyzing' | 'analyzed' | 'error';

export interface EventDocument {
  id: string;
  eventId: string;
  name: string;
  size: number;
  sizeFormatted: string;
  type: DocumentFileType;
  blobUrl: string;
  status: DocumentStatus;
  errorMessage?: string;
  createdAt: string;
  analyzedAt?: string;
}

export interface EventLink {
  id: string;
  eventId: string;
  url: string;
  label: string;
  createdAt: string;
}

export type SSEEvent =
  | { type: 'activity'; data: ActivityItem }
  | { type: 'doc_status'; data: { docId: string; status: DocumentStatus } }
  | { type: 'context_generated'; data: GeneratedContext }
  | { type: 'error'; data: { message: string; code: string } }
  | { type: 'done' };
