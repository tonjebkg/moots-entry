'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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
import { ScoreBar } from '@/app/components/ui/ScoreBar'
import { TagBadge } from '@/app/components/ui/TagBadge'
import { AvatarInitials } from '@/app/components/ui/AvatarInitials'

type ViewMode = 'ranked' | 'table' | 'pending'
type FilterMode = '' | 'scored' | 'qualified' | 'selected' | 'confirmed' | 'pending'

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
}: {
  contact: ScoredContact
  isExpanded: boolean
  onToggle: () => void
  onOpenDossier: () => void
  onAddToWave: () => void
  onDecline?: () => void
}) {
  const hasScore = contact.score_id !== null && contact.relevance_score !== null
  const firstTag = contact.tags?.[0] || null
  const srcInfo = contact.source ? SOURCE_LABELS[contact.source] : null
  const statusInfo = contact.invitation_status ? EVENT_STATUS_LABELS[contact.invitation_status] : null
  const isPending = ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(contact.source || '') && !contact.invitation_id

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-brand-cream/50 transition-colors"
        onClick={onToggle}
      >
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

        {/* Score bar or enrichment badge */}
        <div className="shrink-0 w-28 flex justify-end">
          {hasScore ? (
            <ScoreBar score={contact.relevance_score!} width={80} />
          ) : (
            <EnrichmentBadge status={contact.enrichment_status} />
          )}
        </div>

        {/* Tag badge */}
        {firstTag && (
          <div className="shrink-0 hidden lg:block">
            <TagBadge label={firstTag} variant={getTagVariant(firstTag)} />
          </div>
        )}

        {/* Event status badge */}
        {statusInfo && (
          <div className="shrink-0 hidden md:block">
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        )}

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
              View Full Dossier
            </button>
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

  // Read filter from URL
  const urlFilter = (searchParams.get('filter') || '') as FilterMode

  // Scoring state
  const [contacts, setContacts] = useState<ScoredContact[]>([])
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [minScoreFilter, setMinScoreFilter] = useState(0)

  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(urlFilter === 'pending' ? 'pending' : 'ranked')
  const [activeFilter, setActiveFilter] = useState<FilterMode>(urlFilter === 'pending' ? '' : urlFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Add to wave modal
  const [waveModalContactIds, setWaveModalContactIds] = useState<string[] | null>(null)

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
      setViewMode('ranked')
      setActiveFilter(urlFilter)
    }
  }, [urlFilter])

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
      default: return list
    }
  }

  // Tiered contacts for ranked view
  const allFiltered = applyFilters(contacts)
  const rankedFiltered = applyActiveFilter(allFiltered)

  const scoredContacts = rankedFiltered.filter(c => c.score_id !== null)
  const enrichedUnscored = rankedFiltered.filter(c => c.score_id === null && c.enrichment_status === 'COMPLETED')
  const unenriched = rankedFiltered.filter(c => c.score_id === null && c.enrichment_status !== 'COMPLETED')

  const viewContacts = viewMode === 'pending'
    ? applyFilters(pendingContacts)
    : viewMode === 'table'
      ? allFiltered
      : rankedFiltered

  // For table bulk selection
  const selectableContactIds = viewContacts.filter(c => !c.invitation_id).map(c => c.contact_id)

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
            fetchData()
          }}
        />
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
              label="Pool"
              value={stats.total_contacts}
              icon={Users}
              iconColor="text-brand-charcoal"
              iconBg="bg-brand-cream"
            />
            <StatCard
              label="Scored"
              value={stats.scored_count}
              icon={Target}
              iconColor="text-brand-terracotta"
              iconBg="bg-brand-terracotta/10"
            />
            <StatCard
              label="Qualified (60+)"
              value={stats.qualified_count}
              icon={CheckCircle}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Pending Review"
              value={stats.pending_review_count}
              icon={Clock}
              iconColor="text-amber-700"
              iconBg="bg-amber-50"
            />
            <StatCard
              label="Selected"
              value={stats.selected_count}
              icon={Send}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
            <StatCard
              label="Confirmed"
              value={stats.confirmed_count}
              icon={CheckCircle}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
            />
          </div>

          {/* Active filter chip */}
          {activeFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ui-tertiary font-medium">Filtered:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-terracotta/10 text-brand-terracotta text-xs font-semibold rounded-full">
                {FILTER_LABELS[activeFilter] || activeFilter}
                <button
                  onClick={() => setActiveFilter('')}
                  className="hover:text-brand-charcoal transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          {/* View Mode Toggle + Search + Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1 bg-brand-cream rounded-lg p-1">
              {([
                { key: 'ranked' as ViewMode, label: `Ranked (${rankedFiltered.length})` },
                { key: 'table' as ViewMode, label: 'Table View' },
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
                  <option value="CSV_IMPORT">Import</option>
                  <option value="MANUAL">Manual</option>
                  <option value="EVENT_IMPORT">Event Import</option>
                </select>
              </div>

              {viewMode === 'ranked' && !activeFilter && (
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

          {/* Ranked List View — Platform Preview */}
          {viewMode === 'ranked' && (
            <div className="space-y-6">
              {rankedFiltered.length > 0 ? (
                <>
                  {/* Tier 1: Scored */}
                  {scoredContacts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Target size={14} className="text-brand-terracotta" />
                        <h3 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">
                          Ranked by AI Score ({scoredContacts.length})
                        </h3>
                      </div>
                      {scoredContacts.map(c => (
                        <ContactRow
                          key={c.contact_id}
                          contact={c}
                          isExpanded={expandedId === c.contact_id}
                          onToggle={() => setExpandedId(expandedId === c.contact_id ? null : c.contact_id)}
                          onOpenDossier={() => setDossierContactId(c.contact_id)}
                          onAddToWave={() => setWaveModalContactIds([c.contact_id])}
                          onDecline={
                            ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(c.source || '') && !c.invitation_id
                              ? () => declineContact(c.contact_id) : undefined
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Tier 2: Enriched, not scored */}
                  {enrichedUnscored.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Database size={14} className="text-emerald-600" />
                        <h3 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">
                          Enriched — Awaiting Scoring ({enrichedUnscored.length})
                        </h3>
                      </div>
                      {enrichedUnscored.map(c => (
                        <ContactRow
                          key={c.contact_id}
                          contact={c}
                          isExpanded={expandedId === c.contact_id}
                          onToggle={() => setExpandedId(expandedId === c.contact_id ? null : c.contact_id)}
                          onOpenDossier={() => setDossierContactId(c.contact_id)}
                          onAddToWave={() => setWaveModalContactIds([c.contact_id])}
                          onDecline={
                            ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(c.source || '') && !c.invitation_id
                              ? () => declineContact(c.contact_id) : undefined
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Tier 3: Not yet enriched */}
                  {unenriched.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Clock size={14} className="text-amber-600" />
                        <h3 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">
                          In Pool — Enrichment Pending ({unenriched.length})
                        </h3>
                      </div>
                      {unenriched.map(c => (
                        <ContactRow
                          key={c.contact_id}
                          contact={c}
                          isExpanded={expandedId === c.contact_id}
                          onToggle={() => setExpandedId(expandedId === c.contact_id ? null : c.contact_id)}
                          onOpenDossier={() => setDossierContactId(c.contact_id)}
                          onAddToWave={() => setWaveModalContactIds([c.contact_id])}
                          onDecline={
                            ['RSVP_SUBMISSION', 'JOIN_REQUEST'].includes(c.source || '') && !c.invitation_id
                              ? () => declineContact(c.contact_id) : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
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
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
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
                    <th className="px-4 py-3 text-center font-semibold text-brand-charcoal w-20">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Company</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Title</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Source</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Event Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {viewContacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-ui-tertiary text-sm">
                        No contacts in pool
                      </td>
                    </tr>
                  ) : (
                    viewContacts.map(c => {
                      const srcInfo = c.source ? SOURCE_LABELS[c.source] : null
                      const statusInfo = c.invitation_status ? EVENT_STATUS_LABELS[c.invitation_status] : null
                      return (
                        <tr
                          key={c.contact_id}
                          className="hover:bg-brand-cream transition-colors cursor-pointer"
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            {!c.invitation_id && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(c.contact_id)}
                                onChange={() => toggleSelect(c.contact_id)}
                                className="rounded border-gray-300"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={() => setDossierContactId(c.contact_id)}>
                            {c.relevance_score != null ? (
                              <ScoreBar score={c.relevance_score} width={60} />
                            ) : (
                              <span className="text-xs text-ui-tertiary">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={() => setDossierContactId(c.contact_id)}>
                            <div className="flex items-center gap-2.5">
                              <AvatarInitials name={c.full_name || '?'} size={28} />
                              <span className="font-medium text-brand-charcoal">{c.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-ui-secondary" onClick={() => setDossierContactId(c.contact_id)}>{c.company || '—'}</td>
                          <td className="px-4 py-3 text-ui-secondary" onClick={() => setDossierContactId(c.contact_id)}>{c.title || '—'}</td>
                          <td className="px-4 py-3" onClick={() => setDossierContactId(c.contact_id)}>
                            {srcInfo ? (
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${srcInfo.color}`}>
                                {srcInfo.label}
                              </span>
                            ) : (
                              <span className="text-xs text-ui-tertiary">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={() => setDossierContactId(c.contact_id)}>
                            {statusInfo ? (
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            ) : (
                              <span className="text-xs text-ui-tertiary">Not invited</span>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {!c.invitation_id && (
                              <button
                                onClick={() => setWaveModalContactIds([c.contact_id])}
                                className="flex items-center gap-1 px-3 py-1 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-md transition-colors ml-auto"
                              >
                                <Plus size={12} />
                                Add to Wave
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
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
    </div>
  )
}
