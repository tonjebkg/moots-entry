'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkles, Settings, Search, Users, Target, CheckCircle, Send, X, Clock,
  Plus, Filter, ChevronDown, ChevronRight, XCircle, Linkedin, Globe, Database, UserPlus
} from 'lucide-react'
import { StatCard } from '@/app/components/ui/StatCard'
import { ScoringJobProgress } from '@/app/components/ScoringJobProgress'
import { DossierPanel } from '@/app/components/DossierPanel'
import { AddToWaveModal } from '@/app/components/AddToWaveModal'
import { AddGuestModal } from '@/app/components/AddGuestModal'
import { ScoreBar } from '@/app/components/ui/ScoreBar'
import { TagBadge } from '@/app/components/ui/TagBadge'
import { AvatarInitials } from '@/app/components/ui/AvatarInitials'

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
}

const EVENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONSIDERING: { label: 'Selected', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  INVITED: { label: 'Invited', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DECLINED: { label: 'Declined', color: 'bg-red-50 text-red-700 border-red-200' },
  WAITLIST: { label: 'Waitlist', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  BOUNCED: { label: 'Bounced', color: 'bg-red-50 text-red-700 border-red-200' },
}

const FILTER_LABELS: Record<string, string> = {
  scored: 'Scored',
  qualified: 'Qualified (60+)',
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

function getTagVariant(tag: string): 'terracotta' | 'gold' | 'forest' | 'default' {
  const lower = tag.toLowerCase()
  if (lower.includes('priority') || lower.includes('vip')) return 'terracotta'
  if (lower.includes('high value') || lower.includes('investor') || lower.includes('speaker')) return 'gold'
  if (lower.includes('coi') || lower.includes('board') || lower.includes('executive')) return 'forest'
  return 'default'
}

function EnrichmentBadge({ status }: { status: string | null }) {
  if (status === 'COMPLETED') return <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border bg-emerald-50 text-emerald-700 border-emerald-200">Enriched</span>
  if (status === 'PENDING') return <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border bg-amber-50 text-amber-700 border-amber-200">Enrichment Pending</span>
  if (status === 'FAILED') return <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border bg-red-50 text-red-700 border-red-200">Enrichment Failed</span>
  return <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border bg-gray-100 text-gray-500 border-gray-200">No Enrichment</span>
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
    : hasScore && contact.relevance_score! >= 60
      ? { label: 'Qualified', color: 'bg-violet-50 text-violet-700 border-violet-200' }
      : hasScore
        ? { label: 'Scored', color: 'bg-sky-50 text-sky-700 border-sky-200' }
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
            <span className="text-xs text-ui-tertiary font-medium">--</span>
          )}
        </div>

        {/* Tag badge — always present, shows category or placeholder */}
        <div className="shrink-0 w-20 hidden lg:flex justify-center">
          {firstTag ? (
            <TagBadge label={firstTag} variant={getTagVariant(firstTag)} />
          ) : (
            <span className="text-xs text-ui-tertiary">—</span>
          )}
        </div>

        {/* Status badge — always present for every contact */}
        <div className="shrink-0 w-24 hidden md:flex justify-center">
          <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border whitespace-nowrap ${computedStatus.color}`}>
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
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[#0077b5]/10 text-[#0077b5] text-[11px] font-semibold rounded-md hover:bg-[#0077b5]/20 transition-colors">
                <Linkedin size={12} /> LinkedIn
              </a>
            )}
            {contact.enrichment_status === 'COMPLETED' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-md">
                <Database size={12} /> Enriched
              </span>
            )}
            {srcInfo && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md ${srcInfo.color}`}>
                {contact.source === 'RSVP_SUBMISSION' || contact.source === 'JOIN_REQUEST' ? <UserPlus size={12} /> : <Globe size={12} />}
                {srcInfo.label}
              </span>
            )}
            {hasScore && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-terracotta/10 text-brand-terracotta text-[11px] font-semibold rounded-md">
                <Target size={12} /> AI Scored
              </span>
            )}
          </div>

          {/* AI Insights */}
          {contact.ai_summary && (
            <div>
              <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">AI-Generated Insights</h4>
              <p className="text-sm text-ui-secondary leading-relaxed">{contact.ai_summary}</p>
            </div>
          )}

          {/* Score rationale (for scored contacts) */}
          {contact.score_rationale && (
            <div>
              <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">Why They Match</h4>
              <p className="text-sm text-ui-secondary leading-relaxed">{contact.score_rationale}</p>
            </div>
          )}

          {/* Objective breakdown (for scored contacts) */}
          {contact.matched_objectives && contact.matched_objectives.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Objective Breakdown</h4>
              <div className="space-y-1.5">
                {contact.matched_objectives.map((mo: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
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
            <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Suggested Talking Points</h4>
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
              className="px-3 py-1.5 border border-ui-border rounded-lg text-xs font-medium text-ui-secondary hover:bg-white transition-colors"
            >
              View Guest Profile
            </button>
            {contact.invitation_id && onChangeStatus && (
              <select
                value={contact.invitation_status || ''}
                onChange={(e) => { e.stopPropagation(); onChangeStatus(contact.invitation_id!, e.target.value) }}
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1.5 border border-ui-border rounded-lg text-xs font-medium text-ui-secondary bg-white focus:outline-none focus:border-brand-terracotta"
              >
                <option value="CONSIDERING">Selected</option>
                <option value="INVITED">Invited</option>
                <option value="ACCEPTED">Confirmed</option>
                <option value="DECLINED">Declined</option>
                <option value="WAITLIST">Waitlist</option>
              </select>
            )}
            {!contact.invitation_id && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToWave() }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-md transition-colors"
              >
                <Plus size={12} />
                Add to Wave
              </button>
            )}
            {isPending && onDecline && (
              <button
                onClick={(e) => { e.stopPropagation(); onDecline() }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-md transition-colors"
              >
                <XCircle size={12} />
                Decline
              </button>
            )}
            {contact.scored_at && (
              <span className="text-[11px] text-ui-tertiary ml-auto">
                Scored {new Date(contact.scored_at).toLocaleDateString()}
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
  const [sortColumn, setSortColumn] = useState<'score' | 'name' | 'company' | 'title' | 'source' | 'status'>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Add to wave modal
  const [waveModalContactIds, setWaveModalContactIds] = useState<string[] | null>(null)

  // Add guest modal
  const [showAddGuest, setShowAddGuest] = useState(false)

  // Scoring feedback
  const [scoringComplete, setScoringComplete] = useState(false)

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
        if (
          !c.full_name?.toLowerCase().includes(q) &&
          !c.company?.toLowerCase().includes(q) &&
          !c.title?.toLowerCase().includes(q)
        ) return false
      }
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false
      return true
    })
  }

  // Apply active filter for ranked view
  function applyActiveFilter(list: ScoredContact[]) {
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

  const viewContacts = viewMode === 'pending'
    ? applyFilters(pendingContacts)
    : rankedFiltered

  // Sorting
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
          <button
            onClick={() => setShowAddGuest(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream transition-colors"
          >
            <UserPlus size={14} />
            Add Guest
          </button>
          <Link
            href={`/dashboard/${eventId}/objectives`}
            className="flex items-center gap-1.5 px-3 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream transition-colors"
          >
            <Settings size={14} />
            Objectives
          </Link>
          <button
            onClick={triggerScoring}
            disabled={triggering || !!activeJobId}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta disabled:opacity-50"
          >
            <Sparkles size={14} />
            {triggering ? 'Starting...' : 'Score All Contacts'}
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
              label="Qualified (60+)"
              value={stats.qualified_count}
              icon={CheckCircle}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
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
                <span className="font-semibold">{stats.qualified_count - stats.selected_count} qualified contacts</span>{' '}
                scoring 60+ haven&apos;t been added to a campaign yet.{' '}
                <button onClick={() => applyUrlFilter('qualified')} className="text-brand-terracotta font-semibold hover:underline">
                  View them →
                </button>
              </p>
            </div>
          )}

          {/* Composite filter readout (D2) */}
          {(() => {
            const parts: string[] = []
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
                    className="text-xs font-semibold text-brand-terracotta hover:underline"
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
                { key: 'all' as ViewMode, label: `All Contacts (${rankedFiltered.length})` },
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
                  <label className="text-xs font-medium text-ui-tertiary">Min Score:</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-xs font-mono text-ui-secondary w-6 text-right">{minScoreFilter}</span>
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
            <div className="flex items-center gap-4 bg-brand-terracotta/5 border border-brand-terracotta/20 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-brand-charcoal">
                {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setWaveModalContactIds(Array.from(selectedIds))}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta"
              >
                <Plus size={14} />
                Add Selected to Wave
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-ui-tertiary hover:text-brand-charcoal"
              >
                Clear
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
                              <span className="text-brand-terracotta text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
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
                              <span className="text-brand-terracotta text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
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
                        : cHasScore && c.relevance_score! >= 60
                          ? { label: 'Qualified', color: 'bg-violet-50 text-violet-700 border-violet-200' }
                          : cHasScore
                            ? { label: 'Scored', color: 'bg-sky-50 text-sky-700 border-sky-200' }
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
                                <span className="text-xs text-ui-tertiary">--</span>
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
                            <td className="px-4 py-3">
                              {firstTag ? (
                                <TagBadge label={firstTag} variant={getTagVariant(firstTag)} />
                              ) : (
                                <span className="text-xs text-ui-tertiary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {srcInfo ? (
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${srcInfo.color}`}>
                                  {srcInfo.label}
                                </span>
                              ) : (
                                <span className="text-xs text-ui-tertiary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border whitespace-nowrap ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
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
                              <td colSpan={9} className="px-0 py-0">
                                <div className="border-t border-ui-border bg-brand-cream px-6 py-4 space-y-4">
                                  {/* Source badges row */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {c.linkedin_url && (
                                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[#0077b5]/10 text-[#0077b5] text-[11px] font-semibold rounded-md hover:bg-[#0077b5]/20 transition-colors">
                                        <Linkedin size={12} /> LinkedIn
                                      </a>
                                    )}
                                    {c.enrichment_status === 'COMPLETED' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-md">
                                        <Database size={12} /> Enriched
                                      </span>
                                    )}
                                    {cHasScore && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-terracotta/10 text-brand-terracotta text-[11px] font-semibold rounded-md">
                                        <Target size={12} /> AI Scored
                                      </span>
                                    )}
                                  </div>

                                  {/* AI Insights */}
                                  {c.ai_summary && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">AI-Generated Insights</h4>
                                      <p className="text-sm text-ui-secondary leading-relaxed">{c.ai_summary}</p>
                                    </div>
                                  )}

                                  {/* Score rationale */}
                                  {c.score_rationale && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">Why They Match</h4>
                                      <p className="text-sm text-ui-secondary leading-relaxed">{c.score_rationale}</p>
                                    </div>
                                  )}

                                  {/* Objective breakdown */}
                                  {c.matched_objectives && c.matched_objectives.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Objective Breakdown</h4>
                                      <div className="space-y-1.5">
                                        {c.matched_objectives.map((mo: any, i: number) => (
                                          <div key={i} className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
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
                                    <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Suggested Talking Points</h4>
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
                                      className="px-3 py-1.5 border border-ui-border rounded-lg text-xs font-medium text-ui-secondary hover:bg-white transition-colors"
                                    >
                                      View Guest Profile
                                    </button>
                                    {c.invitation_id && (
                                      <select
                                        value={c.invitation_status || ''}
                                        onChange={(e) => { e.stopPropagation(); handleChangeStatus(c.invitation_id!, e.target.value) }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2 py-1.5 border border-ui-border rounded-lg text-xs font-medium text-ui-secondary bg-white focus:outline-none focus:border-brand-terracotta"
                                      >
                                        <option value="CONSIDERING">Selected</option>
                                        <option value="INVITED">Invited</option>
                                        <option value="ACCEPTED">Confirmed</option>
                                        <option value="DECLINED">Declined</option>
                                        <option value="WAITLIST">Waitlist</option>
                                      </select>
                                    )}
                                    {!c.invitation_id && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setWaveModalContactIds([c.contact_id]) }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-md transition-colors"
                                      >
                                        <Plus size={12} />
                                        Add to Wave
                                      </button>
                                    )}
                                    {isPending && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); declineContact(c.contact_id) }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-md transition-colors"
                                      >
                                        <XCircle size={12} />
                                        Decline
                                      </button>
                                    )}
                                    {c.scored_at && (
                                      <span className="text-[11px] text-ui-tertiary ml-auto">
                                        Scored {new Date(c.scored_at).toLocaleDateString()}
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
                    ? 'Add contacts to your People Database, then define event objectives to start scoring.'
                    : 'Try adjusting your search or filters.'}
                </p>
                {contacts.length === 0 && (
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/dashboard/people" className="px-4 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream">
                      Go to People
                    </Link>
                    <Link href={`/dashboard/${eventId}/objectives`} className="px-5 py-2.5 bg-brand-terracotta text-white text-sm font-semibold rounded-pill hover:bg-brand-terracotta/90 shadow-cta">
                      Set Objectives
                    </Link>
                  </div>
                )}
              </div>
            )
          )}

          {/* Pending Review View */}
          {viewMode === 'pending' && (
            <div className="space-y-4">
              {viewContacts.length > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
                    <p className="text-sm text-amber-800">
                      <strong>{pendingContacts.length}</strong> inbound contact{pendingContacts.length > 1 ? 's' : ''} from RSVPs and join requests awaiting your review.
                      Review their AI intelligence below and decide: add to an invitation wave (approve) or decline.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {viewContacts.map(c => (
                      <ContactRow
                        key={c.contact_id}
                        contact={c}
                        isExpanded={expandedId === c.contact_id}
                        onToggle={() => setExpandedId(expandedId === c.contact_id ? null : c.contact_id)}
                        onOpenDossier={() => setDossierContactId(c.contact_id)}
                        onAddToWave={() => setWaveModalContactIds([c.contact_id])}
                        onChangeStatus={handleChangeStatus}
                        onDecline={() => declineContact(c.contact_id)}
                      />
                    ))}
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
    </div>
  )
}
