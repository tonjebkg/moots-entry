'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Settings, Search, Users, Target, CheckCircle, Send, X } from 'lucide-react'
import { StatCard } from '@/app/components/ui/StatCard'
import { ScoreCard } from '@/app/components/ScoreCard'
import { ScoringDashboard } from '@/app/components/ScoringDashboard'
import { ScoringJobProgress } from '@/app/components/ScoringJobProgress'
import { GuestDetailPanel } from '@/app/components/GuestDetailPanel'
import { DossierPanel } from '@/app/components/DossierPanel'
import { ScoreBar } from '@/app/components/ui/ScoreBar'
import { TagBadge } from '@/app/components/ui/TagBadge'
import { AvatarInitials } from '@/app/components/ui/AvatarInitials'
import { GuestProfile } from '@/types/guest'

type ViewMode = 'ranked' | 'table' | 'unscored'

type NeonStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DRAFT'

interface ScoredContact {
  contact_id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  company: string | null
  title: string | null
  emails: string | null
  tags: string[] | null
  score_id: string | null
  relevance_score: number | null
  matched_objectives: any[] | null
  score_rationale: string | null
  talking_points: string[] | null
  scored_at: string | null
}

interface Stats {
  total_contacts: number
  scored_count: number
  avg_score: number | null
  max_score: number | null
  min_score: number | null
}

interface Guest {
  id: string
  full_name: string
  email: string
  status: NeonStatus
  plus_ones: number | null
  comments?: string | null
  created_at?: string
}

const STATUS_BG: Record<NeonStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  CANCELLED: 'bg-gray-100 text-ui-tertiary border border-gray-200',
  DRAFT: 'bg-gray-100 text-ui-tertiary border border-gray-200',
}

export default function GuestIntelligencePage() {
  const { eventId } = useParams<{ eventId: string }>()

  // Scoring state
  const [contacts, setContacts] = useState<ScoredContact[]>([])
  const [stats, setStats] = useState<Stats>({ total_contacts: 0, scored_count: 0, avg_score: null, max_score: null, min_score: null })
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [minScoreFilter, setMinScoreFilter] = useState(0)

  // Guest state
  const [guests, setGuests] = useState<Guest[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('ranked')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null)
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (minScoreFilter > 0) params.set('min_score', minScoreFilter.toString())

      const [scoringRes, guestsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/scoring?${params}`),
        fetch(`/api/events/${eventId}/join-requests`),
      ])

      if (scoringRes.ok) {
        const data = await scoringRes.json()
        setContacts(data.contacts)
        setStats(data.stats)
        if (data.active_job) {
          setActiveJobId(data.active_job.id)
        }
      }

      if (guestsRes.ok) {
        const data = await guestsRes.json()
        setGuests(data.join_requests || [])
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

  async function handleStatusChange(guestId: string, newStatus: NeonStatus, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      const res = await fetch(`/api/join-requests/${guestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }
      fetchData()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  function handleGuestClick(guestId: string) {
    const guest = guests.find(g => g.id === guestId)
    if (guest) {
      setSelectedGuest({
        id: guest.id,
        event_id: parseInt(eventId),
        first_name: guest.full_name?.split(' ')[0] || '',
        last_name: guest.full_name?.split(' ').slice(1).join(' ') || '',
        email: guest.email,
        company: '',
        tier: 'TIER_2',
        priority: 'NORMAL',
        status: guest.status === 'APPROVED' ? 'ACCEPTED' :
                guest.status === 'REJECTED' ? 'DECLINED' :
                guest.status === 'CANCELLED' ? 'CANCELLED' : 'CONSIDERING',
        expected_plus_ones: guest.plus_ones || 0,
        created_at: guest.created_at || new Date().toISOString(),
        updated_at: guest.created_at || new Date().toISOString(),
      } as GuestProfile)
    }
  }

  function openDossier(contactId: string) {
    setDossierContactId(contactId)
  }

  // Derived data
  const scoredContacts = contacts.filter(c => c.score_id !== null)
  const unscoredContacts = contacts.filter(c => c.score_id === null)
  const qualifiedCount = scoredContacts.filter(c => (c.relevance_score || 0) >= 60).length
  const invitedCount = guests.filter(g => g.status === 'APPROVED').length

  // Filter contacts by search
  const filteredContacts = (viewMode === 'unscored' ? unscoredContacts : scoredContacts).filter(c => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q)
    )
  })

  // Build a score map from scored contacts for the table view
  const scoreMap = new Map<string, { score: number; contact_id: string }>()
  for (const c of scoredContacts) {
    if (c.full_name) {
      scoreMap.set(c.full_name.toLowerCase(), { score: c.relevance_score || 0, contact_id: c.contact_id })
    }
  }

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
              AI-scored contacts ranked by relevance to your event objectives
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
          {/* Stat Cards Row */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Guest Pool"
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
              value={qualifiedCount}
              icon={CheckCircle}
              iconColor="text-emerald-700"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Invited"
              value={invitedCount}
              icon={Send}
              iconColor="text-blue-700"
              iconBg="bg-blue-50"
            />
          </div>

          {/* View Mode Toggle + Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1 bg-brand-cream rounded-lg p-1">
              {([
                { key: 'ranked' as ViewMode, label: `Ranked List (${scoredContacts.length})` },
                { key: 'table' as ViewMode, label: 'Table View' },
                { key: 'unscored' as ViewMode, label: `Unscored (${unscoredContacts.length})` },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key)}
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
              {viewMode === 'ranked' && (
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

          {/* Ranked List View */}
          {viewMode === 'ranked' && (
            <div className="space-y-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map(c => (
                  <div key={c.contact_id} onClick={() => openDossier(c.contact_id)} className="cursor-pointer">
                    <ScoreCard
                      contactName={c.full_name}
                      company={c.company}
                      title={c.title}
                      photoUrl={c.photo_url}
                      score={c.relevance_score || 0}
                      rationale={c.score_rationale}
                      matchedObjectives={c.matched_objectives}
                      talkingPoints={c.talking_points}
                      scoredAt={c.scored_at}
                    />
                  </div>
                ))
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
                    <th className="px-4 py-3 text-center font-semibold text-brand-charcoal w-20">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Company</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Title</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Tags</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">RSVP Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-ui-tertiary text-sm">
                        No contacts in pool
                      </td>
                    </tr>
                  ) : (
                    contacts
                      .filter(c => {
                        if (!searchQuery.trim()) return true
                        const q = searchQuery.toLowerCase()
                        return c.full_name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)
                      })
                      .map(c => {
                        // Find matching guest for RSVP status
                        const matchingGuest = guests.find(g =>
                          g.full_name?.toLowerCase() === c.full_name?.toLowerCase() ||
                          g.email?.toLowerCase() === (c.emails || '').toLowerCase()
                        )
                        return (
                          <tr
                            key={c.contact_id}
                            onClick={() => openDossier(c.contact_id)}
                            className="hover:bg-brand-cream transition-colors cursor-pointer"
                          >
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
                              <div className="flex flex-wrap gap-1">
                                {(c.tags || []).slice(0, 2).map(tag => (
                                  <TagBadge key={tag} label={tag} />
                                ))}
                                {(c.tags || []).length > 2 && (
                                  <span className="text-xs text-ui-tertiary">+{(c.tags || []).length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {matchingGuest ? (
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${STATUS_BG[matchingGuest.status]}`}>
                                  {matchingGuest.status}
                                </span>
                              ) : (
                                <span className="text-xs text-ui-tertiary">Not invited</span>
                              )}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {matchingGuest && matchingGuest.status === 'PENDING' && (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={(e) => handleStatusChange(matchingGuest.id, 'APPROVED', e)}
                                    className="px-3 py-1 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-md transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={(e) => handleStatusChange(matchingGuest.id, 'REJECTED', e)}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
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

          {/* Unscored View */}
          {viewMode === 'unscored' && (
            <div className="space-y-4">
              {filteredContacts.length > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
                    <p className="text-sm text-amber-800">
                      <strong>{unscoredContacts.length}</strong> contacts have not been scored yet.
                      {' '}
                      <button
                        onClick={triggerScoring}
                        disabled={triggering || !!activeJobId}
                        className="font-semibold text-brand-terracotta hover:underline disabled:opacity-50"
                      >
                        Run AI Scoring
                      </button>
                      {' '}to evaluate them against your event objectives.
                    </p>
                  </div>
                  <div className="bg-white rounded-card shadow-card p-4">
                    <div className="flex flex-wrap gap-2">
                      {filteredContacts.slice(0, 40).map(c => (
                        <button
                          key={c.contact_id}
                          onClick={() => openDossier(c.contact_id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-brand-cream hover:bg-brand-cream/70 text-sm text-brand-charcoal rounded-full transition-colors"
                        >
                          <AvatarInitials name={c.full_name || '?'} size={20} />
                          {c.full_name}
                        </button>
                      ))}
                      {filteredContacts.length > 40 && (
                        <span className="px-3 py-1.5 text-xs text-ui-tertiary self-center">
                          +{filteredContacts.length - 40} more
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-card shadow-card">
                  <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500 opacity-60" />
                  <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-1">All contacts scored</h3>
                  <p className="text-sm text-ui-tertiary">Every contact in your pool has been evaluated.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Guest Detail Panel */}
      {selectedGuest && (
        <GuestDetailPanel
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
        />
      )}

      {/* Dossier Panel */}
      {dossierContactId && (
        <DossierPanel
          eventId={eventId}
          contactId={dossierContactId}
          onClose={() => setDossierContactId(null)}
        />
      )}
    </div>
  )
}
