'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkles, Settings, Search, Users, Target, CheckCircle, Send, X, Clock,
  Plus, Filter, ChevronDown, ChevronRight, XCircle, Linkedin, Globe, Database, UserPlus,
  Upload, Calendar, Tag, Check, Link2, Zap
} from 'lucide-react'
import { StatCard } from '@/app/components/ui/StatCard'
import { ScoringJobProgress } from '@/app/components/ScoringJobProgress'
import { DossierPanel } from '@/app/components/DossierPanel'
import { AddToWaveModal } from '@/app/components/AddToWaveModal'
import { AddGuestModal } from '@/app/components/AddGuestModal'
import { formatUSDate } from '@/lib/datetime'
import { ScoreBar } from '@/app/components/ui/ScoreBar'
import { TagBadge } from '@/app/components/ui/TagBadge'
import { AvatarInitials } from '@/app/components/ui/AvatarInitials'
// GuestBadges removed — replaced by dedicated Role column (Issue 1, 86.5)

type ViewMode = 'all' | 'pending'
type FilterMode = '' | 'scored' | 'qualified' | 'selected' | 'confirmed' | 'pending' | 'high_uninvited' | 'unscored'

interface ScoredContact {
  contact_id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  company: string | null
  title: string | null
  emails: any | null
  tags: string[] | null
  enrichment_status: string | null
  ai_summary: string | null
  source: string | null
  linkedin_url: string | null
  score_id: string | null
  relevance_score: number | null
  matched_objectives: any[] | null
  score_rationale: string | null
  talking_points: string[] | null
  scored_at: string | null
  invitation_id: string | null
  invitation_status: string | null
  invitation_tier: string | null
  campaign_id: string | null
  referred_by_name: string | null
  guest_role: string | null
  guest_priority: string | null
  rsvp_submission_id: string | null
}

interface Stats {
  total_contacts: number
  scored_count: number
  avg_score: number | null
  max_score: number | null
  min_score: number | null
  qualified_count: number
  pending_review_count: number
  selected_count: number
  confirmed_count: number
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  RSVP_SUBMISSION: { label: 'RSVP', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  JOIN_REQUEST: { label: 'Join Request', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  CSV_IMPORT: { label: 'Import', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  EVENT_IMPORT: { label: 'Import', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  MANUAL: { label: 'Manual', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  ENRICHMENT: { label: 'Enriched', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  WALK_IN: { label: 'Walk-in', color: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const EVENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IN_POOL: { label: 'In Pool', color: 'bg-gray-50 text-gray-500 border-gray-200' },
  CONSIDERING: { label: 'Selected', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  INVITED: { label: 'Invited', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DECLINED: { label: 'Declined', color: 'bg-red-50 text-red-700 border-red-200' },
  WAITLIST: { label: 'Waitlist', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  BOUNCED: { label: 'Bounced', color: 'bg-red-50 text-red-700 border-red-200' },
}

// Full status list for dropdowns (ordered by pipeline progression)
// "Qualified" is NOT an event status — it's an AI scoring metric
const ALL_STATUS_OPTIONS = [
  { value: 'IN_POOL', label: 'In Pool', color: 'text-gray-500' },
  { value: 'CONSIDERING', label: 'Selected', color: 'text-blue-700' },
  { value: 'INVITED', label: 'Invited', color: 'text-amber-700' },
  { value: 'ACCEPTED', label: 'Confirmed', color: 'text-emerald-700' },
  { value: 'DECLINED', label: 'Declined', color: 'text-red-600' },
  { value: 'WAITLIST', label: 'Waitlist', color: 'text-gray-600' },
]

// Role options — functional role at the event (what this person DOES)
const ROLE_OPTIONS = [
  { value: '', label: '—', color: 'text-gray-400' },
  { value: 'SPEAKER', label: 'Speaker', color: 'text-amber-700' },
  { value: 'PARTNER', label: 'Partner', color: 'text-emerald-700' },
  { value: 'TEAM_MEMBER', label: 'Team', color: 'text-sky-700' },
  { value: 'MEDIA', label: 'Media', color: 'text-pink-700' },
]

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = Object.fromEntries(
  ROLE_OPTIONS.filter(o => o.value).map(o => [o.value, { label: o.label, color: o.color }])
)

// Priority options — invitation priority tier (maps to campaign waves)
const PRIORITY_OPTIONS = [
  { value: '', label: '—', color: 'text-gray-400', bg: '' },
  { value: 'VIP', label: 'VIP', color: 'text-amber-800', bg: 'bg-amber-100 border-amber-300' },
  { value: 'TIER_1', label: 'Tier 1', color: 'text-brand-charcoal', bg: '' },
  { value: 'TIER_2', label: 'Tier 2', color: 'text-brand-charcoal', bg: '' },
  { value: 'TIER_3', label: 'Tier 3', color: 'text-brand-charcoal', bg: '' },
  { value: 'WAITLIST', label: 'Waitlist', color: 'text-gray-500', bg: '' },
]

const PRIORITY_DISPLAY: Record<string, { label: string; color: string; bg: string }> = Object.fromEntries(
  PRIORITY_OPTIONS.filter(o => o.value).map(o => [o.value, { label: o.label, color: o.color, bg: o.bg }])
)

const FILTER_LABELS: Record<string, string> = {
  scored: 'Scored',
  qualified: 'AI Qualified (60+)',
  selected: 'Selected',
  confirmed: 'Confirmed',
  pending: 'Pending Review',
  high_uninvited: 'High Score, Not Invited',
  unscored: 'Unscored',
}

const DEFAULT_STATS: Stats = {
  total_contacts: 0, scored_count: 0, avg_score: null, max_score: null, min_score: null,
  qualified_count: 0, pending_review_count: 0, selected_count: 0, confirmed_count: 0,
}

function getTagVariant(_tag: string): 'default' {
  // All tags use the same neutral gray pill styling.
  // VIP distinction belongs in the Priority column, not in tags.
  return 'default'
}

function EnrichmentBadge({ status }: { status: string | null }) {
  if (status === 'COMPLETED') return <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border bg-emerald-50 text-emerald-700 border-emerald-200">Enriched</span>
  if (status === 'PENDING') return <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border bg-amber-50 text-amber-700 border-amber-200">Enrichment Pending</span>
  if (status === 'FAILED') return <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border bg-red-50 text-red-700 border-red-200">Enrichment Failed</span>
  return <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border bg-gray-100 text-gray-500 border-gray-200">No Enrichment</span>
}

function ContactRow({
  contact,
  isExpanded,
  onToggle,
  onOpenDossier,
  onAddToWave,
  onDecline,
  onChangeStatus,
  isSelected,
  onToggleSelect,
}: {
  contact: ScoredContact
  isExpanded: boolean
  onToggle: () => void
  onOpenDossier: () => void
  onAddToWave: () => void
  onDecline?: () => void
  onChangeStatus?: (invitationId: string, newStatus: string) => void
  isSelected?: boolean
  onToggleSelect?: () => void
}) {
  const hasScore = contact.score_id !== null && contact.relevance_score !== null
  const firstTag = contact.tags?.[0] || null
  const srcInfo = contact.source ? SOURCE_LABELS[contact.source] : null
  const isPending = ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(contact.source || '') && !contact.invitation_id

  // Compute status for every contact — never blank
  const computedStatus: { label: string; color: string } = contact.invitation_status
    ? EVENT_STATUS_LABELS[contact.invitation_status] || { label: contact.invitation_status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
    : { label: 'In Pool', color: 'bg-gray-50 text-gray-500 border-gray-200' }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-brand-cream/50 transition-colors"
        onClick={onToggle}
      >
        {/* Checkbox */}
        {onToggleSelect && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={onToggleSelect}
              className="rounded border-gray-300"
            />
          </div>
        )}

        {/* Avatar */}
        {contact.photo_url ? (
          <Image src={contact.photo_url} alt={contact.full_name} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" unoptimized />
        ) : (
          <AvatarInitials name={contact.full_name || '?'} size={36} />
        )}

        {/* Name + Title */}
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-semibold text-brand-charcoal truncate">{contact.full_name}</div>
          {(contact.title || contact.company) && (
            <div className="text-sm text-ui-secondary truncate">
              {contact.title}
              {contact.title && contact.company && <span className="text-ui-tertiary"> · </span>}
              {contact.company && <span className="text-brand-forest font-medium">{contact.company}</span>}
            </div>
          )}
        </div>

        {/* Score bar — always present, shows "--" if unscored */}
        <div className="shrink-0 w-24 flex justify-end">
          {hasScore ? (
            <ScoreBar score={contact.relevance_score!} width={72} />
          ) : (
            <span className="text-[13px] text-ui-tertiary font-medium">--</span>
          )}
        </div>

        {/* Tag badge — always present, shows category or placeholder */}
        <div className="shrink-0 w-20 hidden lg:flex justify-center">
          {firstTag ? (
            <TagBadge label={firstTag} variant={getTagVariant(firstTag)} />
          ) : (
            <span className="text-[13px] text-ui-tertiary">—</span>
          )}
        </div>

        {/* Status badge — always present for every contact */}
        <div className="shrink-0 w-24 hidden md:flex justify-center">
          <span className={`inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border whitespace-nowrap ${computedStatus.color}`}>
            {computedStatus.label}
          </span>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          size={16}
          className={`text-ui-tertiary shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded profile */}
      {isExpanded && (
        <div className="border-t border-ui-border bg-brand-cream px-5 py-4 space-y-4">
          {/* Source badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[#0077b5]/10 text-[#0077b5] text-[13px] font-semibold rounded-md hover:bg-[#0077b5]/20 transition-colors">
                <Linkedin size={12} /> LinkedIn
              </a>
            )}
            {contact.enrichment_status === 'COMPLETED' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[13px] font-semibold rounded-md">
                <Database size={12} /> Enriched
              </span>
            )}
            {srcInfo && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-[13px] font-semibold rounded-md ${srcInfo.color}`}>
                {contact.source === 'RSVP_SUBMISSION' || contact.source === 'JOIN_REQUEST' ? <UserPlus size={12} /> : <Globe size={12} />}
                {srcInfo.label}
              </span>
            )}
            {hasScore && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-terracotta/10 text-brand-terracotta text-[13px] font-semibold rounded-md">
                <Target size={12} /> AI Scored
              </span>
            )}
          </div>

          {/* AI Insights */}
          {contact.ai_summary && (
            <div>
              <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">AI-Generated Insights</h4>
              <p className="text-sm text-ui-secondary leading-relaxed">{contact.ai_summary}</p>
            </div>
          )}

          {/* Score rationale (for scored contacts) */}
          {contact.score_rationale && (
            <div>
              <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">Why They Match</h4>
              <p className="text-sm text-ui-secondary leading-relaxed">{contact.score_rationale}</p>
            </div>
          )}

          {/* Criteria breakdown (for scored contacts) */}
          {contact.matched_objectives && contact.matched_objectives.length > 0 && (
            <div>
              <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Criteria Breakdown</h4>
              <div className="space-y-1.5">
                {contact.matched_objectives.map((mo: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded flex items-center justify-center text-[13px] font-bold shrink-0 ${
                      mo.match_score >= 70 ? 'bg-emerald-50 text-emerald-700'
                        : mo.match_score >= 40 ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-50 text-ui-tertiary'
                    }`}>
                      {mo.match_score}
                    </div>
                    <span className="text-sm text-brand-charcoal">{mo.objective_text || 'Objective'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talking Points */}
          <div>
            <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Suggested Talking Points</h4>
            {contact.talking_points && contact.talking_points.length > 0 ? (
              <ul className="space-y-1">
                {contact.talking_points.map((tp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ui-secondary">
                    <span className="text-brand-terracotta mt-0.5">•</span>
                    <span className="font-display italic">{tp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ui-tertiary italic">
                {hasScore ? 'No talking points generated for this contact.' : 'Score this contact to generate personalized talking points.'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDossier() }}
              className="px-3 py-1.5 border border-ui-border rounded-lg text-[13px] font-medium text-ui-secondary hover:bg-white transition-colors"
            >
              View Guest Profile
            </button>
            {contact.invitation_id && onChangeStatus && (
              <select
                value={contact.invitation_status || ''}
                onChange={(e) => { e.stopPropagation(); onChangeStatus(contact.invitation_id!, e.target.value) }}
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1.5 border border-ui-border rounded-lg text-[13px] font-medium text-ui-secondary bg-white focus:outline-none focus:border-brand-terracotta"
              >
                {ALL_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            {!contact.invitation_id && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToWave() }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-[13px] font-semibold rounded-md transition-colors"
              >
                <Send size={12} />
                Send Invites
              </button>
            )}
            {isPending && onDecline && (
              <button
                onClick={(e) => { e.stopPropagation(); onDecline() }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold rounded-md transition-colors"
              >
                <XCircle size={12} />
                Decline
              </button>
            )}
            {contact.scored_at && (
              <span className="text-[13px] text-ui-tertiary ml-auto">
                Scored {formatUSDate(new Date(contact.scored_at))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GuestIntelligencePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read filter and action from URL
  const urlFilter = (searchParams.get('filter') || '') as FilterMode
  const urlAction = searchParams.get('action') || ''
  const urlObjective = searchParams.get('objective') || ''

  // Scoring state
  const [contacts, setContacts] = useState<ScoredContact[]>([])
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [minScoreFilter, setMinScoreFilter] = useState(0)

  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(urlFilter === 'pending' ? 'pending' : 'all')
  const [activeFilter, setActiveFilter] = useState<FilterMode>(urlFilter === 'pending' ? '' : urlFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<'score' | 'name' | 'company' | 'title' | 'source' | 'status' | 'role' | 'priority'>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Add to wave modal
  const [waveModalContactIds, setWaveModalContactIds] = useState<string[] | null>(null)

  // Add guest modal + import menus
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showImportCsv, setShowImportCsv] = useState(false)
  const [showImportPeople, setShowImportPeople] = useState(false)
  const [showImportEvent, setShowImportEvent] = useState(false)

  // Status dropdown per contact
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)

  // Role + Priority dropdown per contact
  const [roleDropdownId, setRoleDropdownId] = useState<string | null>(null)
  const [priorityDropdownId, setPriorityDropdownId] = useState<string | null>(null)

  // Bulk actions
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)

  // Tag management
  const [tagManagerId, setTagManagerId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  // Pending review min score
  const [pendingMinScore, setPendingMinScore] = useState(0)

  // Team assignments
  const [teamAssignments, setTeamAssignments] = useState<Record<string, { id: string; assigned_to: string; assigned_to_name: string; assigned_to_email: string; role: string }[]>>({})
  const [workspaceMembers, setWorkspaceMembers] = useState<{ user_id: string; user_full_name: string; user_email: string; role: string }[]>([])
  const [assignDropdownId, setAssignDropdownId] = useState<string | null>(null)

  // Scoring feedback
  const [scoringComplete, setScoringComplete] = useState(false)

  // Toast for status changes
  const [toast, setToast] = useState<{ message: string; contactId: string } | null>(null)
  const toastTimer = useRef<NodeJS.Timeout | null>(null)

  // Auto-trigger scoring guard
  const autoScoreTriggered = useRef(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '500' })
      if (minScoreFilter > 0) params.set('min_score', minScoreFilter.toString())

      const res = await fetch(`/api/events/${eventId}/scoring?${params}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts)
        setStats(data.stats)
        if (data.active_job) {
          setActiveJobId(data.active_job.id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId, minScoreFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch team assignments and workspace members
  const fetchTeamData = useCallback(async () => {
    try {
      // Get workspace ID from session
      const sessionRes = await fetch('/api/auth/session')
      let workspaceId = ''
      if (sessionRes.ok) {
        const sess = await sessionRes.json()
        workspaceId = sess.workspace?.id || ''
      }

      const [assignRes, membersRes] = await Promise.all([
        fetch(`/api/events/${eventId}/team-assignments`),
        workspaceId ? fetch(`/api/workspaces/${workspaceId}/members`) : Promise.resolve(null),
      ])
      if (assignRes.ok) {
        const data = await assignRes.json()
        const grouped: typeof teamAssignments = {}
        for (const a of data.assignments || []) {
          if (!grouped[a.contact_id]) grouped[a.contact_id] = []
          grouped[a.contact_id].push(a)
        }
        setTeamAssignments(grouped)
      }
      if (membersRes && membersRes.ok) {
        const data = await membersRes.json()
        setWorkspaceMembers(data.members || [])
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  useEffect(() => {
    fetchTeamData()
  }, [fetchTeamData])

  // Sync URL filter on mount
  useEffect(() => {
    if (urlFilter === 'pending') {
      setViewMode('pending')
      setActiveFilter('')
    } else if (urlFilter) {
      setViewMode('all')
      setActiveFilter(urlFilter as FilterMode)
    }
  }, [urlFilter])

  // Auto-trigger scoring when navigated with ?action=score
  useEffect(() => {
    if (urlAction === 'score' && !autoScoreTriggered.current && !loading && !triggering && !activeJobId) {
      autoScoreTriggered.current = true
      triggerScoring()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlAction, loading])

  // Helper: update filter in local state AND URL
  function applyUrlFilter(filter: FilterMode, mode: ViewMode = 'all') {
    setActiveFilter(filter)
    setViewMode(mode)
    const params = new URLSearchParams()
    if (filter) params.set('filter', filter)
    if (mode === 'pending') params.set('filter', 'pending')
    const qs = params.toString()
    router.replace(`/dashboard/${eventId}/guest-intelligence${qs ? `?${qs}` : ''}`)
  }

  async function triggerScoring() {
    setTriggering(true)
    try {
      const res = await fetch(`/api/events/${eventId}/scoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        const data = await res.json()
        setActiveJobId(data.job_id)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to start scoring')
      }
    } catch (err) {
      console.error('Failed to trigger scoring:', err)
    } finally {
      setTriggering(false)
    }
  }

  async function declineContact(contactId: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/decline-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to decline contact:', err)
    }
  }

  async function handleChangeStatus(invitationId: string, newStatus: string) {
    try {
      await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchData()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  async function bulkChangeStatus(newStatus: string) {
    const contactsToUpdate = contacts.filter(c => selectedIds.has(c.contact_id) && c.invitation_id)
    for (const c of contactsToUpdate) {
      await handleChangeStatus(c.invitation_id!, newStatus)
    }
    setBulkStatusOpen(false)
    setSelectedIds(new Set())
  }

  async function bulkDecline() {
    if (!confirm(`Decline ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''}?`)) return
    for (const id of selectedIds) {
      await declineContact(id)
    }
    setSelectedIds(new Set())
  }

  async function bulkApprove() {
    const pendingIds = Array.from(selectedIds).filter(id => {
      const c = contacts.find(cc => cc.contact_id === id)
      return c && ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(c.source || '') && !c.invitation_id
    })
    if (pendingIds.length === 0) return
    for (const id of pendingIds) {
      const c = contacts.find(cc => cc.contact_id === id)
      if (c) await approveContact(c.contact_id, c.full_name)
    }
    setSelectedIds(new Set())
  }

  async function bulkAssignMember(userId: string) {
    for (const id of selectedIds) {
      await assignMember(id, userId)
    }
    setBulkAssignOpen(false)
    setSelectedIds(new Set())
    showToast(`Assigned ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''} to team member`, '')
  }

  function showToast(message: string, contactId: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, contactId })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  async function approveContact(contactId: string, name: string) {
    try {
      // Create an invitation with QUALIFIED status if none exists
      const res = await fetch(`/api/events/${eventId}/scoring`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, action: 'approve' }),
      })
      if (res.ok) {
        showToast(`${name} approved — moved to In Pool`, contactId)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to approve contact:', err)
    }
  }

  async function assignMember(contactId: string, userId: string) {
    try {
      await fetch(`/api/events/${eventId}/team-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, assigned_to: userId, role: 'PRIMARY_CONTACT' }),
      })
      fetchTeamData()
      setAssignDropdownId(null)
    } catch (err) {
      console.error('Failed to assign member:', err)
    }
  }

  async function unassignMember(contactId: string, assignmentId: string) {
    try {
      await fetch(`/api/events/${eventId}/team-assignments/${assignmentId}`, {
        method: 'DELETE',
      })
      fetchTeamData()
    } catch (err) {
      console.error('Failed to unassign member:', err)
    }
  }

  // Per-contact scoring
  const [scoringContactId, setScoringContactId] = useState<string | null>(null)

  async function scoreContact(contactId: string) {
    setScoringContactId(contactId)
    try {
      const res = await fetch(`/api/events/${eventId}/scoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: [contactId] }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.job_id) setActiveJobId(data.job_id)
        else fetchData()
      }
    } catch (err) {
      console.error('Failed to score contact:', err)
    } finally {
      setScoringContactId(null)
    }
  }

  async function updateRole(contactId: string, role: string | null) {
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_role: role || null }),
      })
      setContacts(prev => prev.map(c =>
        c.contact_id === contactId ? { ...c, guest_role: role || null } : c
      ))
      setRoleDropdownId(null)
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  async function updatePriority(contactId: string, priority: string | null) {
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_priority: priority || null }),
      })
      setContacts(prev => prev.map(c =>
        c.contact_id === contactId ? { ...c, guest_priority: priority || null } : c
      ))
      setPriorityDropdownId(null)
    } catch (err) {
      console.error('Failed to update priority:', err)
    }
  }

  async function addTagToContact(contactId: string, tag: string) {
    try {
      await fetch(`/api/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      fetchData()
    } catch (err) {
      console.error('Failed to add tag:', err)
    }
  }

  async function removeTagFromContact(contactId: string, tag: string) {
    try {
      await fetch(`/api/contacts/${contactId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      fetchData()
    } catch (err) {
      console.error('Failed to remove tag:', err)
    }
  }

  function toggleSelect(contactId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach(id => next.delete(id))
      } else {
        ids.forEach(id => next.add(id))
      }
      return next
    })
  }

  // Derived data
  const pendingContacts = contacts.filter(
    c => ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(c.source || '') && !c.invitation_id
      && !(c.tags || []).includes('declined')
  )

  // Apply search + source filter
  function applyFilters(list: ScoredContact[]) {
    return list.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = c.full_name?.toLowerCase().includes(q)
        const matchesCompany = c.company?.toLowerCase().includes(q)
        const matchesTitle = c.title?.toLowerCase().includes(q)
        const matchesTags = (c.tags || []).some(t => t.toLowerCase().includes(q))
        if (!matchesName && !matchesCompany && !matchesTitle && !matchesTags) return false
      }
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false
      return true
    })
  }

  // Apply active filter for ranked view
  function applyActiveFilter(list: ScoredContact[]) {
    // Objective-specific filter from URL (e.g., ?objective=<uuid>)
    if (urlObjective) {
      return list.filter(c =>
        c.matched_objectives?.some(
          (mo: any) => mo.objective_id === urlObjective && (mo.match_score ?? 0) >= 50
        )
      )
    }
    if (!activeFilter) return list
    switch (activeFilter) {
      case 'scored': return list.filter(c => c.score_id !== null)
      case 'qualified': return list.filter(c => c.relevance_score !== null && c.relevance_score >= 60)
      case 'selected': return list.filter(c => c.invitation_id !== null)
      case 'confirmed': return list.filter(c => c.invitation_status === 'ACCEPTED')
      case 'high_uninvited': return list.filter(c => c.relevance_score !== null && c.relevance_score >= 70 && !c.invitation_id)
      case 'unscored': return list.filter(c => c.score_id === null)
      default: return list
    }
  }

  // Tiered contacts for ranked view
  const allFiltered = applyFilters(contacts)
  const rankedFiltered = applyActiveFilter(allFiltered)

  // Derive objective filter text from contact data
  const objectiveFilterText = urlObjective
    ? (() => {
        for (const c of contacts) {
          const mo = c.matched_objectives?.find((m: any) => m.objective_id === urlObjective)
          if (mo?.objective_text) return mo.objective_text as string
        }
        return 'Selected Objective'
      })()
    : ''

  const viewContacts = viewMode === 'pending'
    ? applyFilters(pendingContacts)
    : rankedFiltered

  // Sorting
  const ROLE_SORT_ORDER: Record<string, number> = { SPEAKER: 1, PARTNER: 2, TEAM_MEMBER: 3, MEDIA: 4 }
  const PRIORITY_SORT_ORDER: Record<string, number> = { VIP: 1, TIER_1: 2, TIER_2: 3, TIER_3: 4, WAITLIST: 5 }
  function getRoleOrder(role: string | null): number { return role ? (ROLE_SORT_ORDER[role] ?? 99) : 99 }
  function getPriorityOrder(priority: string | null): number { return priority ? (PRIORITY_SORT_ORDER[priority] ?? 99) : 99 }

  function getStatusOrder(c: ScoredContact): number {
    if (c.invitation_status === 'ACCEPTED') return 6
    if (c.invitation_status === 'INVITED') return 5
    if (c.invitation_status === 'CONSIDERING') return 4
    if (c.invitation_status === 'DECLINED') return 7
    if (c.invitation_status === 'WAITLIST') return 3
    if (c.score_id && c.relevance_score !== null && c.relevance_score >= 60) return 2
    if (c.score_id) return 1
    return 0
  }

  const sortedViewContacts = [...viewContacts].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    switch (sortColumn) {
      case 'score': return ((a.relevance_score ?? -1) - (b.relevance_score ?? -1)) * dir
      case 'name': return (a.full_name || '').localeCompare(b.full_name || '') * dir
      case 'company': return (a.company || '').localeCompare(b.company || '') * dir
      case 'title': return (a.title || '').localeCompare(b.title || '') * dir
      case 'source': return (a.source || '').localeCompare(b.source || '') * dir
      case 'status': return (getStatusOrder(a) - getStatusOrder(b)) * dir
      case 'role': return (getRoleOrder(a.guest_role) - getRoleOrder(b.guest_role)) * dir
      case 'priority': return (getPriorityOrder(a.guest_priority) - getPriorityOrder(b.guest_priority)) * dir
      default: return 0
    }
  })

  function handleSort(col: typeof sortColumn) {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      setSortDirection(col === 'score' ? 'desc' : 'asc')
    }
  }

  // For table bulk selection — all contacts selectable regardless of invitation status
  const selectableContactIds = viewContacts.map(c => c.contact_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-terracotta/10 flex items-center justify-center">
            <Sparkles size={20} className="text-brand-terracotta" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-charcoal tracking-tight">Guest Intelligence</h1>
            <p className="text-sm text-ui-tertiary">
              AI-scored contacts ranked by relevance — the vetting hub for both inbound and outbound guests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream transition-colors"
            >
              <UserPlus size={14} />
              Add Guests
              <ChevronDown size={12} />
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => { setShowAddMenu(false); setShowAddGuest(true) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-cream transition-colors"
                  >
                    <UserPlus size={14} className="text-ui-tertiary" />
                    Add Single Guest
                  </button>
                  <button
                    onClick={() => { setShowAddMenu(false); setShowImportCsv(true) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-cream transition-colors"
                  >
                    <Upload size={14} className="text-ui-tertiary" />
                    Import from CSV
                  </button>
                  <button
                    onClick={() => { setShowAddMenu(false); setShowImportPeople(true) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-cream transition-colors"
                  >
                    <Users size={14} className="text-ui-tertiary" />
                    Import from People
                  </button>
                  <button
                    onClick={() => { setShowAddMenu(false); setShowImportEvent(true) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-cream transition-colors"
                  >
                    <Calendar size={14} className="text-ui-tertiary" />
                    Import from Previous Event
                  </button>
                </div>
              </>
            )}
          </div>
          <Link
            href={`/dashboard/${eventId}/targeting`}
            className="flex items-center gap-1.5 px-3 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream transition-colors"
          >
            <Settings size={14} />
            Targeting
          </Link>
          <button
            onClick={triggerScoring}
            disabled={triggering || !!activeJobId}
            className="flex items-center gap-1.5 px-3 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} />
            {triggering ? 'Starting...' : 'Re-score All'}
          </button>
        </div>
      </div>

      {/* Active Job Progress */}
      {activeJobId && (
        <ScoringJobProgress
          jobId={activeJobId}
          type="scoring"
          onComplete={() => {
            setActiveJobId(null)
            setScoringComplete(true)
            fetchData()
            setTimeout(() => setScoringComplete(false), 4000)
          }}
        />
      )}

      {/* Scoring complete banner (C2) */}
      {scoringComplete && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-card">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-800">
            AI scoring complete. Contacts have been ranked below.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-ui-tertiary text-sm font-medium">Loading intelligence...</div>
        </div>
      ) : (
        <>
          {/* Stat Cards Row — Vetting Funnel */}
          <div className="grid grid-cols-6 gap-3">
            <StatCard
              label="Guest Pool"
              value={stats.total_contacts}
              icon={Users}
              iconColor="text-brand-charcoal"
              iconBg="bg-brand-cream"
              onClick={() => applyUrlFilter('', 'all')}
            />
            <StatCard
              label="Scored"
              value={stats.scored_count}
              icon={Target}
              iconColor="text-brand-terracotta"
              iconBg="bg-brand-terracotta/10"
              onClick={() => applyUrlFilter('scored')}
            />
            <StatCard
              label="AI Qualified"
              value={stats.qualified_count}
              icon={Sparkles}
              iconColor="text-violet-700"
              iconBg="bg-violet-50"
              onClick={() => applyUrlFilter('qualified')}
            />
            <StatCard
              label="Pending Review"
              value={stats.pending_review_count}
              icon={Clock}
              iconColor="text-amber-700"
              iconBg="bg-amber-50"
              onClick={() => applyUrlFilter('', 'pending')}
            />
            <StatCard
              label="Selected"
              value={stats.selected_count}
              icon={Send}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
              onClick={() => applyUrlFilter('selected')}
            />
            <StatCard
              label="Confirmed"
              value={stats.confirmed_count}
              icon={CheckCircle}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
              onClick={() => applyUrlFilter('confirmed')}
            />
          </div>

          {/* AI Insight Callout */}
          {stats.qualified_count > 0 && stats.selected_count < stats.qualified_count && (
            <div className="flex items-center gap-3 p-4 bg-brand-cream rounded-card border border-brand-forest/10">
              <Sparkles size={16} className="text-brand-terracotta shrink-0" />
              <p className="text-sm text-brand-charcoal">
                <span className="font-semibold">{stats.qualified_count - stats.selected_count} AI-qualified contacts</span>{' '}
                scoring 60+ haven&apos;t been added to an invitation campaign yet.{' '}
                <button onClick={() => applyUrlFilter('qualified')} className="text-brand-terracotta font-semibold hover:underline">
                  View them →
                </button>
              </p>
            </div>
          )}

          {/* Composite filter readout (D2) */}
          {(() => {
            const parts: string[] = []
            if (urlObjective) parts.push(`Objective filter`)
            if (activeFilter) parts.push(FILTER_LABELS[activeFilter] || activeFilter)
            if (searchQuery.trim()) parts.push(`"${searchQuery.trim()}"`)
            if (sourceFilter !== 'all') parts.push(SOURCE_LABELS[sourceFilter]?.label || sourceFilter)
            if (minScoreFilter > 0) parts.push(`Min score ${minScoreFilter}`)
            if (viewMode === 'pending') parts.push('Pending Review')

            if (parts.length > 0) {
              return (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ui-secondary">
                    Showing <strong>{sortedViewContacts.length}</strong> contact{sortedViewContacts.length !== 1 ? 's' : ''} · {parts.join(' + ')}
                  </span>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSourceFilter('all')
                      setMinScoreFilter(0)
                      applyUrlFilter('', 'all')
                    }}
                    className="text-[13px] font-semibold text-brand-terracotta hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )
            }
            return null
          })()}

          {/* View Mode Toggle + Search + Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1 bg-brand-cream rounded-lg p-1">
              {([
                { key: 'all' as ViewMode, label: urlObjective ? `Filtered (${rankedFiltered.length})` : `All Contacts (${rankedFiltered.length})` },
                { key: 'pending' as ViewMode, label: `Pending Review (${pendingContacts.length})` },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setViewMode(tab.key); setSelectedIds(new Set()); setExpandedId(null) }}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    viewMode === tab.key
                      ? 'bg-white text-brand-charcoal shadow-sm'
                      : 'text-ui-tertiary hover:text-brand-charcoal'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Source filter */}
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-ui-tertiary" />
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="text-sm border border-ui-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand-terracotta"
                >
                  <option value="all">All Sources</option>
                  <option value="RSVP_SUBMISSION">RSVP Inbound</option>
                  <option value="CSV_IMPORT">CSV Import</option>
                  <option value="EVENT_IMPORT">Event Import</option>
                  <option value="MANUAL">Manual</option>
                  <option value="JOIN_REQUEST">Join Request</option>
                </select>
              </div>

              {viewMode === 'all' && !activeFilter && (
                <div className="flex items-center gap-2">
                  <label className="text-[13px] font-medium text-ui-tertiary">Min Score:</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-[13px] font-mono text-ui-secondary w-6 text-right">{minScoreFilter}</span>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={14} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-56 pl-9 pr-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ui-tertiary hover:text-brand-charcoal">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-white border border-ui-border shadow-sm rounded-lg px-4 py-3 sticky top-[123px] z-30">
              <span className="text-sm font-medium text-brand-charcoal">
                {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setWaveModalContactIds(Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-[13px] font-semibold rounded-pill transition-colors"
              >
                <Send size={13} />
                Send Invites
              </button>
              {viewMode === 'pending' && (
                <button
                  onClick={bulkApprove}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-pill transition-colors"
                >
                  <Check size={13} />
                  Approve Selected
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setBulkStatusOpen(!bulkStatusOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-ui-border bg-white text-[13px] font-semibold text-brand-charcoal rounded-pill hover:bg-brand-cream transition-colors"
                >
                  Change Status
                  <ChevronDown size={10} />
                </button>
                {bulkStatusOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBulkStatusOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                      {ALL_STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => bulkChangeStatus(opt.value)}
                          className={`w-full text-left px-3 py-1.5 text-[13px] font-medium ${opt.color} hover:bg-brand-cream transition-colors`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setBulkAssignOpen(!bulkAssignOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-ui-border bg-white text-[13px] font-semibold text-brand-charcoal rounded-pill hover:bg-brand-cream transition-colors"
                >
                  <Users size={13} />
                  Assign to Team
                  <ChevronDown size={10} />
                </button>
                {bulkAssignOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBulkAssignOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                      {workspaceMembers.map(m => (
                        <button
                          key={m.user_id}
                          onClick={() => bulkAssignMember(m.user_id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                        >
                          <AvatarInitials name={m.user_full_name || '?'} size={20} />
                          <span className="font-medium">{m.user_full_name}</span>
                        </button>
                      ))}
                      {workspaceMembers.length === 0 && (
                        <div className="px-3 py-2 text-[13px] text-ui-tertiary">No team members</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={bulkDecline}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-[13px] font-semibold rounded-pill hover:bg-red-50 transition-colors"
              >
                <XCircle size={13} />
                Decline Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[13px] text-ui-tertiary hover:text-brand-charcoal ml-auto"
              >
                Clear
              </button>
            </div>
          )}

          {/* Objective filter banner */}
          {urlObjective && (
            <div className="flex items-center gap-3 p-3 bg-brand-terracotta/5 border border-brand-terracotta/20 rounded-lg">
              <Target size={16} className="text-brand-terracotta shrink-0" />
              <p className="text-sm text-brand-charcoal flex-1">
                <span className="font-semibold">Filtered by objective:</span>{' '}
                <span className="text-ui-secondary">{objectiveFilterText}</span>{' '}
                · <span className="font-semibold">{rankedFiltered.length} contact{rankedFiltered.length !== 1 ? 's' : ''}</span> qualify
              </p>
              <button
                onClick={() => router.replace(`/dashboard/${eventId}/guest-intelligence`)}
                className="text-sm font-semibold text-brand-terracotta hover:underline whitespace-nowrap"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Unified Table View */}
          {viewMode === 'all' && (
            sortedViewContacts.length > 0 ? (
              <div className="bg-white border border-ui-border rounded-card shadow-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-brand-cream border-b border-ui-border">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectableContactIds.length > 0 && selectableContactIds.every(id => selectedIds.has(id))}
                          onChange={() => toggleSelectAll(selectableContactIds)}
                          className="rounded border-gray-300"
                        />
                      </th>
                      {([
                        { key: 'score' as const, label: 'Score', align: 'text-center', width: 'w-20' },
                        { key: 'name' as const, label: 'Name', align: 'text-left', width: '' },
                        { key: 'company' as const, label: 'Company', align: 'text-left', width: '' },
                        { key: 'title' as const, label: 'Title', align: 'text-left', width: '' },
                      ] as const).map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={`px-4 py-3 ${col.align} font-semibold text-brand-charcoal ${col.width} cursor-pointer select-none hover:bg-brand-cream/80 transition-colors`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortColumn === col.key && (
                              <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                      {([
                        { key: 'role' as const, label: 'Role', minWidth: 180 },
                        { key: 'priority' as const, label: 'Priority', minWidth: 110 },
                      ] as const).map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                          style={{ minWidth: col.minWidth }}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortColumn === col.key && (
                              <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Tags</th>
                      {([
                        { key: 'source' as const, label: 'Source', minWidth: 0 },
                        { key: 'status' as const, label: 'Event Status', minWidth: 140 },
                      ] as const).map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                          style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortColumn === col.key && (
                              <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right font-semibold text-brand-charcoal w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ui-border">
                    {sortedViewContacts.map(c => {
                      const srcInfo = c.source ? SOURCE_LABELS[c.source] : null
                      const cHasScore = c.score_id !== null && c.relevance_score !== null
                      const statusInfo: { label: string; color: string } = c.invitation_status
                        ? EVENT_STATUS_LABELS[c.invitation_status] || { label: c.invitation_status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                        : { label: 'In Pool', color: 'bg-gray-50 text-gray-500 border-gray-200' }
                      const isExpanded = expandedId === c.contact_id
                      const firstTag = c.tags?.[0] || null
                      const isPending = ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(c.source || '') && !c.invitation_id
                      return (
                        <React.Fragment key={c.contact_id}>
                          <tr
                            className={`hover:bg-brand-cream/50 transition-colors cursor-pointer ${isExpanded ? 'bg-brand-cream/30' : ''}`}
                            onClick={() => setExpandedId(isExpanded ? null : c.contact_id)}
                          >
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(c.contact_id)}
                                onChange={() => toggleSelect(c.contact_id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {c.relevance_score != null ? (
                                <ScoreBar score={c.relevance_score} width={60} />
                              ) : (
                                <span className="text-[13px] text-ui-tertiary">--</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <AvatarInitials name={c.full_name || '?'} size={28} />
                                <span className="font-medium text-brand-charcoal">{c.full_name}</span>
                                {c.referred_by_name && (
                                  <span className="text-ui-tertiary" title={`Referred by ${c.referred_by_name}`}>
                                    <Link2 size={13} />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-ui-secondary">{c.company || '—'}</td>
                            <td className="px-4 py-3 text-ui-secondary">{c.title || '—'}</td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={() => setRoleDropdownId(roleDropdownId === c.contact_id ? null : c.contact_id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium rounded border whitespace-nowrap transition-all cursor-pointer ${
                                    c.guest_role && ROLE_DISPLAY[c.guest_role]
                                      ? `${ROLE_DISPLAY[c.guest_role].color} bg-gray-50 border-gray-200 hover:ring-1 hover:ring-brand-terracotta/30`
                                      : 'text-gray-400 bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200'
                                  }`}
                                >
                                  {c.guest_role && ROLE_DISPLAY[c.guest_role] ? ROLE_DISPLAY[c.guest_role].label : '—'}
                                  <ChevronDown size={10} />
                                </button>
                                {roleDropdownId === c.contact_id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownId(null)} />
                                    <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                                      {ROLE_OPTIONS.map(opt => (
                                        <button
                                          key={opt.value}
                                          onClick={() => updateRole(c.contact_id, opt.value || null)}
                                          className={`w-full text-left px-3 py-1.5 text-[13px] font-medium ${opt.color} hover:bg-brand-cream transition-colors ${c.guest_role === opt.value || (!c.guest_role && !opt.value) ? 'bg-brand-cream/60' : ''}`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={() => setPriorityDropdownId(priorityDropdownId === c.contact_id ? null : c.contact_id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium rounded border whitespace-nowrap transition-all cursor-pointer ${
                                    c.guest_priority && PRIORITY_DISPLAY[c.guest_priority]
                                      ? PRIORITY_DISPLAY[c.guest_priority].bg
                                        ? `${PRIORITY_DISPLAY[c.guest_priority].color} ${PRIORITY_DISPLAY[c.guest_priority].bg} hover:ring-1 hover:ring-amber-400/40`
                                        : `${PRIORITY_DISPLAY[c.guest_priority].color} bg-gray-50 border-gray-200 hover:ring-1 hover:ring-brand-terracotta/30`
                                      : 'text-gray-400 bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200'
                                  }`}
                                >
                                  {c.guest_priority && PRIORITY_DISPLAY[c.guest_priority] ? PRIORITY_DISPLAY[c.guest_priority].label : '—'}
                                  <ChevronDown size={10} />
                                </button>
                                {priorityDropdownId === c.contact_id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setPriorityDropdownId(null)} />
                                    <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                                      {PRIORITY_OPTIONS.map(opt => (
                                        <button
                                          key={opt.value}
                                          onClick={() => updatePriority(c.contact_id, opt.value || null)}
                                          className={`w-full text-left px-3 py-1.5 text-[13px] font-medium ${opt.color} hover:bg-brand-cream transition-colors ${c.guest_priority === opt.value || (!c.guest_priority && !opt.value) ? 'bg-brand-cream/60' : ''} ${opt.value === 'VIP' ? 'font-semibold' : ''}`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {(c.tags || []).length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {(c.tags || []).slice(0, 3).map((t, ti) => (
                                    <TagBadge key={ti} label={t} variant={getTagVariant(t)} />
                                  ))}
                                  {(c.tags?.length || 0) > 3 && (
                                    <span
                                      className="text-[13px] font-semibold text-ui-tertiary bg-gray-100 px-1.5 py-0.5 rounded cursor-default"
                                      title={(c.tags || []).slice(3).join(', ')}
                                    >
                                      +{(c.tags?.length || 0) - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[13px] text-ui-tertiary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {srcInfo ? (
                                <span className={`inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border ${srcInfo.color}`}>
                                  {srcInfo.label}
                                </span>
                              ) : (
                                <span className="text-[13px] text-ui-tertiary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={() => setStatusDropdownId(statusDropdownId === c.contact_id ? null : c.contact_id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-semibold rounded border whitespace-nowrap ${statusInfo.color} hover:ring-1 hover:ring-brand-terracotta/30 transition-all cursor-pointer`}
                                >
                                  {statusInfo.label}
                                  <ChevronDown size={8} />
                                </button>
                                {statusDropdownId === c.contact_id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownId(null)} />
                                    <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                                      {ALL_STATUS_OPTIONS.map(opt => (
                                        <button
                                          key={opt.value}
                                          onClick={() => {
                                            if (c.invitation_id) {
                                              handleChangeStatus(c.invitation_id, opt.value)
                                            }
                                            setStatusDropdownId(null)
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-[13px] font-medium ${opt.color} hover:bg-brand-cream transition-colors`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ChevronDown
                                size={14}
                                className={`text-ui-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </td>
                          </tr>
                          {/* Expandable detail row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={11} className="px-0 py-0">
                                <div className="border-t border-ui-border bg-brand-cream px-6 py-4 space-y-4">
                                  {/* Guest name + role + priority header */}
                                  <div className="flex items-center gap-3">
                                    <AvatarInitials name={c.full_name || '?'} size={36} />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-display text-lg font-semibold text-brand-charcoal">{c.full_name}</span>
                                        {c.guest_role && ROLE_DISPLAY[c.guest_role] && (
                                          <span className={`text-[13px] font-semibold ${ROLE_DISPLAY[c.guest_role].color}`}>
                                            {ROLE_DISPLAY[c.guest_role].label}
                                          </span>
                                        )}
                                        {c.guest_priority && PRIORITY_DISPLAY[c.guest_priority] && (
                                          <span className={`inline-flex px-2 py-0.5 text-[13px] font-semibold rounded ${
                                            PRIORITY_DISPLAY[c.guest_priority].bg || 'bg-gray-50 text-brand-charcoal'
                                          } ${PRIORITY_DISPLAY[c.guest_priority].color}`}>
                                            {PRIORITY_DISPLAY[c.guest_priority].label}
                                          </span>
                                        )}
                                      </div>
                                      {(c.title || c.company) && (
                                        <div className="text-sm text-ui-secondary">
                                          {c.title}{c.title && c.company && ' · '}{c.company}
                                        </div>
                                      )}
                                      {c.referred_by_name && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <Link2 size={11} className="text-ui-tertiary" />
                                          <span className="text-[13px] text-ui-secondary">
                                            Referred by <span className="font-medium text-brand-charcoal">{c.referred_by_name}</span>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Priority flag: low score + referred by someone important */}
                                  {c.referred_by_name && c.relevance_score != null && c.relevance_score < 60 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                      <span className="text-amber-600 text-sm">⚑</span>
                                      <span className="text-[13px] text-amber-800 font-medium">
                                        Low score ({c.relevance_score}), but referred by {c.referred_by_name} — consider the relationship
                                      </span>
                                    </div>
                                  )}

                                  {/* Source badges row */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {c.linkedin_url && (
                                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[#0077b5]/10 text-[#0077b5] text-[13px] font-semibold rounded-md hover:bg-[#0077b5]/20 transition-colors">
                                        <Linkedin size={12} /> LinkedIn
                                      </a>
                                    )}
                                    {c.enrichment_status === 'COMPLETED' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[13px] font-semibold rounded-md">
                                        <Database size={12} /> Enriched
                                      </span>
                                    )}
                                    {cHasScore && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-terracotta/10 text-brand-terracotta text-[13px] font-semibold rounded-md">
                                        <Target size={12} /> AI Scored
                                      </span>
                                    )}
                                  </div>

                                  {/* Full Tags + Manage */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider">Tags</h4>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setTagManagerId(tagManagerId === c.contact_id ? null : c.contact_id); setTagInput('') }}
                                        className="text-[13px] font-semibold text-brand-terracotta hover:underline"
                                      >
                                        Manage Tags
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {(c.tags || []).length > 0 ? (
                                        (c.tags || []).map((t, ti) => (
                                          <span key={ti} className="inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium rounded-full border bg-white text-brand-charcoal border-ui-border">
                                            {t}
                                            {tagManagerId === c.contact_id && (
                                              <button onClick={(e) => { e.stopPropagation(); removeTagFromContact(c.contact_id, t) }} className="text-ui-tertiary hover:text-red-500">
                                                <X size={10} />
                                              </button>
                                            )}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[13px] text-ui-tertiary">No tags</span>
                                      )}
                                    </div>
                                    {tagManagerId === c.contact_id && (
                                      <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          value={tagInput}
                                          onChange={(e) => setTagInput(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && tagInput.trim()) {
                                              addTagToContact(c.contact_id, tagInput.trim())
                                              setTagInput('')
                                            }
                                          }}
                                          placeholder="Add tag and press Enter..."
                                          className="px-2.5 py-1.5 text-[13px] border border-ui-border rounded-md bg-white focus:outline-none focus:border-brand-terracotta w-48"
                                        />
                                        <div className="flex gap-1">
                                          {['Speaker', 'Priority'].filter(s => !(c.tags || []).includes(s)).map(s => (
                                            <button
                                              key={s}
                                              onClick={() => addTagToContact(c.contact_id, s)}
                                              className="px-2 py-1 text-[13px] font-medium text-brand-terracotta border border-brand-terracotta/30 rounded-full hover:bg-brand-terracotta/5"
                                            >
                                              + {s}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Assigned Team */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider">Assigned Team</h4>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {(teamAssignments[c.contact_id] || []).map(a => (
                                        <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[13px] font-semibold rounded-full border border-blue-200">
                                          <AvatarInitials name={a.assigned_to_name || '?'} size={18} />
                                          {a.assigned_to_name}
                                          <button
                                            onClick={(e) => { e.stopPropagation(); unassignMember(c.contact_id, a.id) }}
                                            className="text-blue-400 hover:text-red-500 ml-0.5"
                                          >
                                            <X size={10} />
                                          </button>
                                        </span>
                                      ))}
                                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => setAssignDropdownId(assignDropdownId === c.contact_id ? null : c.contact_id)}
                                          className="inline-flex items-center gap-1 px-2 py-1 text-[13px] font-medium text-brand-terracotta border border-brand-terracotta/30 rounded-full hover:bg-brand-terracotta/5 transition-colors"
                                        >
                                          <Plus size={10} /> Assign Member
                                        </button>
                                        {assignDropdownId === c.contact_id && (
                                          <>
                                            <div className="fixed inset-0 z-10" onClick={() => setAssignDropdownId(null)} />
                                            <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                                              {workspaceMembers
                                                .filter(m => !(teamAssignments[c.contact_id] || []).some(a => a.assigned_to === m.user_id))
                                                .map(m => (
                                                  <button
                                                    key={m.user_id}
                                                    onClick={() => assignMember(c.contact_id, m.user_id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                                                  >
                                                    <AvatarInitials name={m.user_full_name || '?'} size={20} />
                                                    <div className="text-left">
                                                      <div className="font-medium">{m.user_full_name}</div>
                                                      <div className="text-ui-tertiary text-[13px]">{m.role}</div>
                                                    </div>
                                                  </button>
                                                ))}
                                              {workspaceMembers.filter(m => !(teamAssignments[c.contact_id] || []).some(a => a.assigned_to === m.user_id)).length === 0 && (
                                                <div className="px-3 py-2 text-[13px] text-ui-tertiary">All members assigned</div>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* AI Insights */}
                                  {c.ai_summary && (
                                    <div>
                                      <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">AI-Generated Insights</h4>
                                      <p className="text-sm text-ui-secondary leading-relaxed">{c.ai_summary}</p>
                                    </div>
                                  )}

                                  {/* Score rationale */}
                                  {c.score_rationale && (
                                    <div>
                                      <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">Why They Match</h4>
                                      <p className="text-sm text-ui-secondary leading-relaxed">{c.score_rationale}</p>
                                    </div>
                                  )}

                                  {/* Criteria breakdown */}
                                  {c.matched_objectives && c.matched_objectives.length > 0 && (
                                    <div>
                                      <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Criteria Breakdown</h4>
                                      <div className="space-y-1.5">
                                        {c.matched_objectives.map((mo: any, i: number) => (
                                          <div key={i} className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded flex items-center justify-center text-[13px] font-bold shrink-0 ${
                                              mo.match_score >= 70 ? 'bg-emerald-50 text-emerald-700'
                                                : mo.match_score >= 40 ? 'bg-amber-50 text-amber-700'
                                                : 'bg-gray-50 text-ui-tertiary'
                                            }`}>
                                              {mo.match_score}
                                            </div>
                                            <span className="text-sm text-brand-charcoal">{mo.objective_text || 'Objective'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Talking Points */}
                                  <div>
                                    <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Suggested Talking Points</h4>
                                    {c.talking_points && c.talking_points.length > 0 ? (
                                      <ul className="space-y-1">
                                        {c.talking_points.map((tp, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm text-ui-secondary">
                                            <span className="text-brand-terracotta mt-0.5">•</span>
                                            <span className="font-display italic">{tp}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-ui-tertiary italic">
                                        {cHasScore ? 'No talking points generated for this contact.' : 'Score this contact to generate personalized talking points.'}
                                      </p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-3 pt-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setDossierContactId(c.contact_id) }}
                                      className="px-3 py-1.5 border border-ui-border rounded-lg text-[13px] font-medium text-ui-secondary hover:bg-white transition-colors"
                                    >
                                      View Guest Profile
                                    </button>
                                    {c.invitation_id && (
                                      <select
                                        value={c.invitation_status || ''}
                                        onChange={(e) => { e.stopPropagation(); handleChangeStatus(c.invitation_id!, e.target.value) }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2 py-1.5 border border-ui-border rounded-lg text-[13px] font-medium text-ui-secondary bg-white focus:outline-none focus:border-brand-terracotta"
                                      >
                                        {ALL_STATUS_OPTIONS.map(opt => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    )}
                                    {!c.invitation_id && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setWaveModalContactIds([c.contact_id]) }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-[13px] font-semibold rounded-md transition-colors"
                                      >
                                        <Send size={12} />
                                        Send Invites
                                      </button>
                                    )}
                                    {isPending && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); declineContact(c.contact_id) }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold rounded-md transition-colors"
                                      >
                                        <XCircle size={12} />
                                        Decline
                                      </button>
                                    )}
                                    {!cHasScore ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); scoreContact(c.contact_id) }}
                                        disabled={scoringContactId === c.contact_id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-terracotta/30 text-brand-terracotta text-[13px] font-semibold rounded-md hover:bg-brand-terracotta/5 transition-colors disabled:opacity-50"
                                      >
                                        <Sparkles size={12} />
                                        {scoringContactId === c.contact_id ? 'Scoring...' : 'Score Now'}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); scoreContact(c.contact_id) }}
                                        disabled={scoringContactId === c.contact_id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-ui-tertiary hover:text-brand-charcoal transition-colors disabled:opacity-50"
                                      >
                                        <Sparkles size={12} />
                                        {scoringContactId === c.contact_id ? 'Scoring...' : 'Re-score'}
                                      </button>
                                    )}
                                    {c.scored_at && (
                                      <span className="text-[13px] text-ui-tertiary ml-auto">
                                        Scored {formatUSDate(new Date(c.scored_at))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-card shadow-card">
                <Sparkles size={32} className="mx-auto mb-3 text-ui-tertiary opacity-50" />
                <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-2">
                  {contacts.length === 0 ? 'No contacts to score' : 'No matching contacts'}
                </h3>
                <p className="text-sm text-ui-tertiary mb-4">
                  {contacts.length === 0
                    ? 'Add contacts to your People Database, then define targeting criteria to start scoring.'
                    : 'Try adjusting your search or filters.'}
                </p>
                {contacts.length === 0 && (
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/dashboard/people" className="px-4 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream">
                      Go to People
                    </Link>
                    <Link href={`/dashboard/${eventId}/targeting`} className="px-5 py-2.5 bg-brand-terracotta text-white text-sm font-semibold rounded-pill hover:bg-brand-terracotta/90 shadow-cta">
                      Set Targeting
                    </Link>
                  </div>
                )}
              </div>
            )
          )}

          {/* Pending Review View — with checkboxes, bulk actions, min score filter */}
          {viewMode === 'pending' && (
            <div className="space-y-4">
              {viewContacts.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex-1">
                      <p className="text-sm text-amber-800">
                        <strong>{pendingContacts.length}</strong> inbound contact{pendingContacts.length > 1 ? 's' : ''} from RSVPs and join requests awaiting your review.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <label className="text-[13px] font-medium text-ui-tertiary">Min Score:</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={pendingMinScore}
                        onChange={(e) => setPendingMinScore(parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-[13px] font-mono text-ui-secondary w-6 text-right">{pendingMinScore}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-ui-border rounded-card shadow-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-brand-cream border-b border-ui-border">
                        <tr>
                          <th className="px-3 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={viewContacts.length > 0 && viewContacts.every(c => selectedIds.has(c.contact_id))}
                              onChange={() => toggleSelectAll(viewContacts.map(c => c.contact_id))}
                              className="rounded border-gray-300"
                            />
                          </th>
                          {([
                            { key: 'score' as const, label: 'Score', align: 'text-center', width: 'w-20' },
                            { key: 'name' as const, label: 'Name', align: 'text-left', width: '' },
                            { key: 'company' as const, label: 'Company', align: 'text-left', width: '' },
                            { key: 'title' as const, label: 'Title', align: 'text-left', width: '' },
                          ] as const).map(col => (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className={`px-4 py-3 ${col.align} font-semibold text-brand-charcoal ${col.width} cursor-pointer select-none hover:bg-brand-cream/80 transition-colors`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {col.label}
                                {sortColumn === col.key && (
                                  <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                )}
                              </span>
                            </th>
                          ))}
                          {([
                            { key: 'role' as const, label: 'Role', minWidth: 110 },
                            { key: 'priority' as const, label: 'Priority', minWidth: 90 },
                          ] as const).map(col => (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                              style={{ minWidth: col.minWidth }}
                            >
                              <span className="inline-flex items-center gap-1">
                                {col.label}
                                {sortColumn === col.key && (
                                  <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                )}
                              </span>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Tags</th>
                          {([
                            { key: 'source' as const, label: 'Source' },
                            { key: 'status' as const, label: 'Event Status' },
                          ] as const).map(col => (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                            >
                              <span className="inline-flex items-center gap-1">
                                {col.label}
                                {sortColumn === col.key && (
                                  <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                )}
                              </span>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right font-semibold text-brand-charcoal w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ui-border">
                        {sortedViewContacts.filter(c => pendingMinScore === 0 || (c.relevance_score ?? 0) >= pendingMinScore).map(c => {
                          const srcInfo = c.source ? SOURCE_LABELS[c.source] : null
                          const cHasScore = c.score_id !== null && c.relevance_score !== null
                          const isExpanded = expandedId === c.contact_id
                          const firstTag = c.tags?.[0] || null
                          const isPending = ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(c.source || '') && !c.invitation_id
                          return (
                            <React.Fragment key={c.contact_id}>
                              <tr
                                className={`group hover:bg-brand-cream/50 transition-colors cursor-pointer ${isExpanded ? 'bg-brand-cream/30' : ''}`}
                                onClick={() => setExpandedId(isExpanded ? null : c.contact_id)}
                              >
                                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(c.contact_id)}
                                    onChange={() => toggleSelect(c.contact_id)}
                                    className="rounded border-gray-300"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {c.relevance_score != null ? (
                                    <ScoreBar score={c.relevance_score} width={60} />
                                  ) : (
                                    <span className="text-[13px] text-ui-tertiary">--</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <AvatarInitials name={c.full_name || '?'} size={28} />
                                    <span className="font-medium text-brand-charcoal">{c.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-ui-secondary">{c.company || '—'}</td>
                                <td className="px-4 py-3 text-ui-secondary">{c.title || '—'}</td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative">
                                    <button
                                      onClick={() => setRoleDropdownId(roleDropdownId === c.contact_id ? null : c.contact_id)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium rounded border whitespace-nowrap transition-all cursor-pointer ${
                                        c.guest_role && ROLE_DISPLAY[c.guest_role]
                                          ? `${ROLE_DISPLAY[c.guest_role].color} bg-gray-50 border-gray-200 hover:ring-1 hover:ring-brand-terracotta/30`
                                          : 'text-gray-400 bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200'
                                      }`}
                                    >
                                      {c.guest_role && ROLE_DISPLAY[c.guest_role] ? ROLE_DISPLAY[c.guest_role].label : '—'}
                                      <ChevronDown size={10} />
                                    </button>
                                    {roleDropdownId === c.contact_id && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownId(null)} />
                                        <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                                          {ROLE_OPTIONS.map(opt => (
                                            <button
                                              key={opt.value}
                                              onClick={() => updateRole(c.contact_id, opt.value || null)}
                                              className={`w-full text-left px-3 py-1.5 text-[13px] font-medium ${opt.color} hover:bg-brand-cream transition-colors ${c.guest_role === opt.value || (!c.guest_role && !opt.value) ? 'bg-brand-cream/60' : ''}`}
                                            >
                                              {opt.label}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative">
                                    <button
                                      onClick={() => setPriorityDropdownId(priorityDropdownId === c.contact_id ? null : c.contact_id)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium rounded border whitespace-nowrap transition-all cursor-pointer ${
                                        c.guest_priority && PRIORITY_DISPLAY[c.guest_priority]
                                          ? PRIORITY_DISPLAY[c.guest_priority].bg
                                            ? `${PRIORITY_DISPLAY[c.guest_priority].color} ${PRIORITY_DISPLAY[c.guest_priority].bg} hover:ring-1 hover:ring-amber-400/40`
                                            : `${PRIORITY_DISPLAY[c.guest_priority].color} bg-gray-50 border-gray-200 hover:ring-1 hover:ring-brand-terracotta/30`
                                          : 'text-gray-400 bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200'
                                      }`}
                                    >
                                      {c.guest_priority && PRIORITY_DISPLAY[c.guest_priority] ? PRIORITY_DISPLAY[c.guest_priority].label : '—'}
                                      <ChevronDown size={10} />
                                    </button>
                                    {priorityDropdownId === c.contact_id && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => setPriorityDropdownId(null)} />
                                        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                                          {PRIORITY_OPTIONS.map(opt => (
                                            <button
                                              key={opt.value}
                                              onClick={() => updatePriority(c.contact_id, opt.value || null)}
                                              className={`w-full text-left px-3 py-1.5 text-[13px] font-medium ${opt.color} hover:bg-brand-cream transition-colors ${c.guest_priority === opt.value || (!c.guest_priority && !opt.value) ? 'bg-brand-cream/60' : ''} ${opt.value === 'VIP' ? 'font-semibold' : ''}`}
                                            >
                                              {opt.label}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {(c.tags || []).length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      {(c.tags || []).slice(0, 3).map((t, i) => (
                                        <TagBadge key={i} label={t} variant={getTagVariant(t)} />
                                      ))}
                                      {(c.tags?.length || 0) > 3 && (
                                        <span className="text-[13px] font-semibold text-ui-tertiary bg-gray-100 px-1.5 py-0.5 rounded cursor-default" title={(c.tags || []).slice(3).join(', ')}>
                                          +{(c.tags?.length || 0) - 3}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[13px] text-ui-tertiary">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {srcInfo ? (
                                    <span className={`inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border ${srcInfo.color}`}>
                                      {srcInfo.label}
                                    </span>
                                  ) : (
                                    <span className="text-[13px] text-ui-tertiary">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative">
                                    <button
                                      onClick={() => setStatusDropdownId(statusDropdownId === c.contact_id ? null : c.contact_id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-semibold rounded border whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200 hover:ring-1 hover:ring-brand-terracotta/30 transition-all cursor-pointer"
                                    >
                                      Pending Review
                                      <ChevronDown size={8} />
                                    </button>
                                    {statusDropdownId === c.contact_id && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownId(null)} />
                                        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1">
                                          {ALL_STATUS_OPTIONS.map(opt => (
                                            <button
                                              key={opt.value}
                                              onClick={() => {
                                                if (c.invitation_id) {
                                                  handleChangeStatus(c.invitation_id, opt.value)
                                                }
                                                setStatusDropdownId(null)
                                              }}
                                              className={`w-full text-left px-3 py-1.5 text-[13px] font-medium ${opt.color} hover:bg-brand-cream transition-colors`}
                                            >
                                              {opt.label}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1 justify-end">
                                    <button
                                      onClick={() => approveContact(c.contact_id, c.full_name)}
                                      title="Approve"
                                      className="p-1 rounded hover:bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => declineContact(c.contact_id)}
                                      title="Decline"
                                      className="p-1 rounded hover:bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X size={14} />
                                    </button>
                                    <ChevronDown
                                      size={14}
                                      className={`text-ui-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                  </div>
                                </td>
                              </tr>
                              {/* Expandable detail row */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={12} className="px-0 py-0">
                                    <div className="border-t border-ui-border bg-brand-cream px-6 py-4 space-y-4">
                                      {/* Guest name + role + priority header */}
                                      <div className="flex items-center gap-3">
                                        <AvatarInitials name={c.full_name || '?'} size={36} />
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-display text-lg font-semibold text-brand-charcoal">{c.full_name}</span>
                                            {c.guest_role && ROLE_DISPLAY[c.guest_role] && (
                                              <span className={`text-[13px] font-semibold ${ROLE_DISPLAY[c.guest_role].color}`}>
                                                {ROLE_DISPLAY[c.guest_role].label}
                                              </span>
                                            )}
                                            {c.guest_priority && PRIORITY_DISPLAY[c.guest_priority] && (
                                              <span className={`inline-flex px-2 py-0.5 text-[13px] font-semibold rounded ${
                                                PRIORITY_DISPLAY[c.guest_priority].bg || 'bg-gray-50 text-brand-charcoal'
                                              } ${PRIORITY_DISPLAY[c.guest_priority].color}`}>
                                                {PRIORITY_DISPLAY[c.guest_priority].label}
                                              </span>
                                            )}
                                          </div>
                                          {(c.title || c.company) && (
                                            <div className="text-sm text-ui-secondary">
                                              {c.title}{c.title && c.company && ' · '}{c.company}
                                            </div>
                                          )}
                                          {c.referred_by_name && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <Link2 size={11} className="text-ui-tertiary" />
                                              <span className="text-[13px] text-ui-secondary">
                                                Referred by <span className="font-medium text-brand-charcoal">{c.referred_by_name}</span>
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Priority flag: low score + referred by someone important */}
                                      {c.referred_by_name && c.relevance_score != null && c.relevance_score < 60 && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                          <span className="text-amber-600 text-sm">⚑</span>
                                          <span className="text-[13px] text-amber-800 font-medium">
                                            Low score ({c.relevance_score}), but referred by {c.referred_by_name} — consider the relationship
                                          </span>
                                        </div>
                                      )}

                                      {/* Source badges row */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {c.linkedin_url && (
                                          <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[#0077b5]/10 text-[#0077b5] text-[13px] font-semibold rounded-md hover:bg-[#0077b5]/20 transition-colors">
                                            <Linkedin size={12} /> LinkedIn
                                          </a>
                                        )}
                                        {c.enrichment_status === 'COMPLETED' && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[13px] font-semibold rounded-md">
                                            <Database size={12} /> Enriched
                                          </span>
                                        )}
                                        {cHasScore && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-terracotta/10 text-brand-terracotta text-[13px] font-semibold rounded-md">
                                            <Target size={12} /> AI Scored
                                          </span>
                                        )}
                                      </div>

                                      {/* Full Tags + Manage */}
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider">Tags</h4>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setTagManagerId(tagManagerId === c.contact_id ? null : c.contact_id); setTagInput('') }}
                                            className="text-[13px] font-semibold text-brand-terracotta hover:underline"
                                          >
                                            Manage Tags
                                          </button>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {(c.tags || []).length > 0 ? (
                                            (c.tags || []).map((t, ti) => (
                                              <span key={ti} className="inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-medium rounded-full border bg-white text-brand-charcoal border-ui-border">
                                                {t}
                                                {tagManagerId === c.contact_id && (
                                                  <button onClick={(e) => { e.stopPropagation(); removeTagFromContact(c.contact_id, t) }} className="text-ui-tertiary hover:text-red-500">
                                                    <X size={10} />
                                                  </button>
                                                )}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[13px] text-ui-tertiary">No tags</span>
                                          )}
                                        </div>
                                        {tagManagerId === c.contact_id && (
                                          <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                              value={tagInput}
                                              onChange={(e) => setTagInput(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && tagInput.trim()) {
                                                  addTagToContact(c.contact_id, tagInput.trim())
                                                  setTagInput('')
                                                }
                                              }}
                                              placeholder="Add tag and press Enter..."
                                              className="px-2.5 py-1.5 text-[13px] border border-ui-border rounded-md bg-white focus:outline-none focus:border-brand-terracotta w-48"
                                            />
                                            <div className="flex gap-1">
                                              {['Speaker', 'Priority'].filter(s => !(c.tags || []).includes(s)).map(s => (
                                                <button
                                                  key={s}
                                                  onClick={() => addTagToContact(c.contact_id, s)}
                                                  className="px-2 py-1 text-[13px] font-medium text-brand-terracotta border border-brand-terracotta/30 rounded-full hover:bg-brand-terracotta/5"
                                                >
                                                  + {s}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Assigned Team */}
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider">Assigned Team</h4>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {(teamAssignments[c.contact_id] || []).map(a => (
                                            <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[13px] font-semibold rounded-full border border-blue-200">
                                              <AvatarInitials name={a.assigned_to_name || '?'} size={18} />
                                              {a.assigned_to_name}
                                              <button
                                                onClick={(e) => { e.stopPropagation(); unassignMember(c.contact_id, a.id) }}
                                                className="text-blue-400 hover:text-red-500 ml-0.5"
                                              >
                                                <X size={10} />
                                              </button>
                                            </span>
                                          ))}
                                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <button
                                              onClick={() => setAssignDropdownId(assignDropdownId === c.contact_id ? null : c.contact_id)}
                                              className="inline-flex items-center gap-1 px-2 py-1 text-[13px] font-medium text-brand-terracotta border border-brand-terracotta/30 rounded-full hover:bg-brand-terracotta/5 transition-colors"
                                            >
                                              <Plus size={10} /> Assign Member
                                            </button>
                                            {assignDropdownId === c.contact_id && (
                                              <>
                                                <div className="fixed inset-0 z-10" onClick={() => setAssignDropdownId(null)} />
                                                <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                                                  {workspaceMembers
                                                    .filter(m => !(teamAssignments[c.contact_id] || []).some(a => a.assigned_to === m.user_id))
                                                    .map(m => (
                                                      <button
                                                        key={m.user_id}
                                                        onClick={() => assignMember(c.contact_id, m.user_id)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                                                      >
                                                        <AvatarInitials name={m.user_full_name || '?'} size={20} />
                                                        <div className="text-left">
                                                          <div className="font-medium">{m.user_full_name}</div>
                                                          <div className="text-ui-tertiary text-[13px]">{m.role}</div>
                                                        </div>
                                                      </button>
                                                    ))}
                                                  {workspaceMembers.filter(m => !(teamAssignments[c.contact_id] || []).some(a => a.assigned_to === m.user_id)).length === 0 && (
                                                    <div className="px-3 py-2 text-[13px] text-ui-tertiary">All members assigned</div>
                                                  )}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* AI Insights */}
                                      {c.ai_summary && (
                                        <div>
                                          <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">AI-Generated Insights</h4>
                                          <p className="text-sm text-ui-secondary leading-relaxed">{c.ai_summary}</p>
                                        </div>
                                      )}

                                      {/* Score rationale */}
                                      {c.score_rationale && (
                                        <div>
                                          <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">Why They Match</h4>
                                          <p className="text-sm text-ui-secondary leading-relaxed">{c.score_rationale}</p>
                                        </div>
                                      )}

                                      {/* Criteria breakdown */}
                                      {c.matched_objectives && c.matched_objectives.length > 0 && (
                                        <div>
                                          <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Criteria Breakdown</h4>
                                          <div className="space-y-1.5">
                                            {c.matched_objectives.map((mo: any, i: number) => (
                                              <div key={i} className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded flex items-center justify-center text-[13px] font-bold shrink-0 ${
                                                  mo.match_score >= 70 ? 'bg-emerald-50 text-emerald-700'
                                                    : mo.match_score >= 40 ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-gray-50 text-ui-tertiary'
                                                }`}>
                                                  {mo.match_score}
                                                </div>
                                                <span className="text-sm text-brand-charcoal">{mo.objective_text || 'Objective'}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Talking Points */}
                                      <div>
                                        <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Suggested Talking Points</h4>
                                        {c.talking_points && c.talking_points.length > 0 ? (
                                          <ul className="space-y-1">
                                            {c.talking_points.map((tp, i) => (
                                              <li key={i} className="flex items-start gap-2 text-sm text-ui-secondary">
                                                <span className="text-brand-terracotta mt-0.5">•</span>
                                                <span className="font-display italic">{tp}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-sm text-ui-tertiary italic">
                                            {cHasScore ? 'No talking points generated for this contact.' : 'Score this contact to generate personalized talking points.'}
                                          </p>
                                        )}
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-3 pt-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); approveContact(c.contact_id, c.full_name) }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-md transition-colors"
                                        >
                                          <Check size={12} />
                                          Approve
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setWaveModalContactIds([c.contact_id]) }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-[13px] font-semibold rounded-md transition-colors"
                                        >
                                          <Send size={12} />
                                          Send Invites
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); declineContact(c.contact_id) }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold rounded-md transition-colors"
                                        >
                                          <XCircle size={12} />
                                          Decline
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setDossierContactId(c.contact_id) }}
                                          className="px-3 py-1.5 border border-ui-border rounded-lg text-[13px] font-medium text-ui-secondary hover:bg-white transition-colors"
                                        >
                                          View Guest Profile
                                        </button>
                                        {c.scored_at && (
                                          <span className="text-[13px] text-ui-tertiary ml-auto">
                                            Scored {formatUSDate(new Date(c.scored_at))}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-card shadow-card">
                  <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500 opacity-60" />
                  <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-1">No pending reviews</h3>
                  <p className="text-sm text-ui-tertiary">All inbound RSVPs and join requests have been reviewed.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Status change toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-brand-charcoal text-white rounded-lg shadow-lg">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-white/60 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dossier Panel */}
      {dossierContactId && (
        <DossierPanel
          eventId={eventId}
          contactId={dossierContactId}
          onClose={() => setDossierContactId(null)}
        />
      )}

      {/* Add to Wave Modal */}
      {waveModalContactIds && (
        <AddToWaveModal
          eventId={eventId}
          contactIds={waveModalContactIds}
          onClose={() => setWaveModalContactIds(null)}
          onSuccess={() => {
            setWaveModalContactIds(null)
            setSelectedIds(new Set())
            fetchData()
          }}
        />
      )}

      {/* Add Guest Modal */}
      {showAddGuest && (
        <AddGuestModal
          onClose={() => setShowAddGuest(false)}
          onSuccess={() => {
            setShowAddGuest(false)
            fetchData()
          }}
        />
      )}

      {/* Import from CSV Modal (stub) */}
      {showImportCsv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowImportCsv(false)} />
          <div className="relative bg-white rounded-card shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-display text-brand-charcoal">Import from CSV</h3>
              <button onClick={() => setShowImportCsv(false)} className="p-1 hover:bg-brand-cream rounded-lg"><X size={18} className="text-ui-tertiary" /></button>
            </div>
            <div className="border-2 border-dashed border-ui-border rounded-lg p-8 text-center">
              <Upload size={32} className="mx-auto mb-3 text-ui-tertiary" />
              <p className="text-sm font-medium text-brand-charcoal mb-1">Drag & drop your CSV file here</p>
              <p className="text-[13px] text-ui-tertiary mb-4">or click to browse — supports .csv and .xlsx</p>
              <input type="file" accept=".csv,.xlsx" className="hidden" id="csv-upload" onChange={() => alert('CSV import coming soon — contact support for bulk imports.')} />
              <label htmlFor="csv-upload" className="inline-flex px-4 py-2 bg-brand-terracotta text-white text-sm font-semibold rounded-pill cursor-pointer hover:bg-brand-terracotta/90 transition-colors">
                Choose File
              </label>
            </div>
            <p className="text-[13px] text-ui-tertiary mt-3">After upload, you&apos;ll map columns to contact fields before importing.</p>
          </div>
        </div>
      )}

      {/* Import from People Modal (stub) */}
      {showImportPeople && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowImportPeople(false)} />
          <div className="relative bg-white rounded-card shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-display text-brand-charcoal">Import from People Database</h3>
              <button onClick={() => setShowImportPeople(false)} className="p-1 hover:bg-brand-cream rounded-lg"><X size={18} className="text-ui-tertiary" /></button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" />
                <input placeholder="Search people by name, company, or title..." className="w-full pl-9 pr-3 py-2.5 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta" />
              </div>
              <div className="border border-ui-border rounded-lg p-8 text-center">
                <Users size={28} className="mx-auto mb-2 text-ui-tertiary" />
                <p className="text-sm text-ui-tertiary">Search your People Database to add contacts to this event&apos;s guest pool.</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowImportPeople(false)} className="px-4 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Previous Event Modal (stub) */}
      {showImportEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowImportEvent(false)} />
          <div className="relative bg-white rounded-card shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-display text-brand-charcoal">Import from Previous Event</h3>
              <button onClick={() => setShowImportEvent(false)} className="p-1 hover:bg-brand-cream rounded-lg"><X size={18} className="text-ui-tertiary" /></button>
            </div>
            <div className="space-y-3">
              <select className="w-full px-3 py-2.5 border border-ui-border rounded-lg text-sm bg-white focus:outline-none focus:border-brand-terracotta">
                <option value="">Select an event...</option>
                <option disabled>Previous events will appear here</option>
              </select>
              <div className="border border-ui-border rounded-lg p-8 text-center">
                <Calendar size={28} className="mx-auto mb-2 text-ui-tertiary" />
                <p className="text-sm text-ui-tertiary">Select a past event to import its guest list into this event&apos;s pool.</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowImportEvent(false)} className="px-4 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
