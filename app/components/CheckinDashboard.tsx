'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, UserPlus, UserCheck, RefreshCw, X, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { CheckinMetricsBar } from './CheckinMetricsBar'
import { WalkInForm } from './WalkInForm'
import { DossierPanel } from './DossierPanel'
import { AvatarInitials } from './ui/AvatarInitials'
import { TagBadge } from './ui/TagBadge'
import { formatUSTime } from '@/lib/datetime'
import type { CheckinMetrics, EventCheckin, NotArrivedGuest } from '@/types/phase3'

interface CheckinDashboardProps {
  eventId: string
}

interface SearchResult {
  invitation_id: string
  first_name: string
  last_name: string
  email: string
  company: string | null
  title: string | null
  status: string
  checked_in: boolean
  checked_in_at: string | null
  contact_id: string | null
  checkin_id: string | null
}

const ROLE_LABELS: Record<string, string> = {
  TEAM_MEMBER: 'Team Member', PARTNER: 'Partner', CO_HOST: 'Co-host', SPEAKER: 'Speaker', TALENT: 'Talent',
}

const PRIORITY_LABELS: Record<string, string> = {
  VIP: 'VIP', TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3', WAITLIST: 'Waitlist',
}

export function CheckinDashboard({ eventId }: CheckinDashboardProps) {
  const [metrics, setMetrics] = useState<CheckinMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)
  const [checkinFilter, setCheckinFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [showNotArrived, setShowNotArrived] = useState<boolean | null>(null) // null = auto, boolean = user override
  const [userToggledNotArrived, setUserToggledNotArrived] = useState(false)
  const [sortCol, setSortCol] = useState<'time' | 'name' | 'company' | 'table'>('time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`)
      if (res.ok) {
        setMetrics(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 15000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/events/${eventId}/checkin/search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results || [])
        }
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchQuery, eventId])

  async function handleCheckIn(result: SearchResult) {
    setCheckingIn(result.invitation_id)
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: result.invitation_id,
          contact_id: result.contact_id || undefined,
          source: 'INVITATION',
        }),
      })

      if (res.ok) {
        setSearchResults(prev =>
          prev.map(r =>
            r.invitation_id === result.invitation_id
              ? { ...r, checked_in: true, checked_in_at: new Date().toISOString(), checkin_id: 'done' }
              : r
          )
        )
        setLastCheckedIn(`${result.first_name} ${result.last_name}`)
        setTimeout(() => setLastCheckedIn(null), 3000)
        fetchMetrics()
      } else {
        const data = await res.json()
        if (res.status === 409) {
          setSearchResults(prev =>
            prev.map(r =>
              r.invitation_id === result.invitation_id
                ? { ...r, checked_in: true, checkin_id: data.checkin_id }
                : r
            )
          )
        } else {
          setError(data.error || 'Check-in failed')
        }
      }
    } catch (err) {
      console.error('Check-in failed:', err)
    } finally {
      setCheckingIn(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading check-in dashboard...</div>
      </div>
    )
  }

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filteredCheckins = (metrics?.recent_checkins.filter((checkin: EventCheckin) => {
    if (!checkinFilter) return true
    if (checkinFilter === 'walk_ins') return checkin.source === 'WALK_IN'
    if (checkinFilter === 'checked_in') return true
    return true
  }) || []).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortCol) {
      case 'time':
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'name':
        return dir * a.full_name.localeCompare(b.full_name)
      case 'company':
        return dir * (a.company || '').localeCompare(b.company || '')
      case 'table':
        return dir * ((a.table_assignment ?? 0) - (b.table_assignment ?? 0))
      default:
        return 0
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ui-tertiary hover:text-brand-charcoal border border-ui-border rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={() => setShowWalkIn(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Walk-in
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-medium">×</button>
        </div>
      )}

      {lastCheckedIn && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {lastCheckedIn} checked in successfully
        </div>
      )}

      {metrics && (
        <div className="space-y-2">
          <CheckinMetricsBar
            metrics={metrics}
            onFilter={setCheckinFilter}
            activeFilter={checkinFilter}
          />
          {checkinFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ui-tertiary font-medium">Filtered:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-terracotta/10 text-brand-terracotta text-xs font-semibold rounded-full">
                {checkinFilter === 'expected' ? 'Expected' : checkinFilter === 'checked_in' ? 'Checked In' : checkinFilter === 'not_arrived' ? 'Not Arrived' : 'Walk-ins'}
                <button
                  onClick={() => setCheckinFilter('')}
                  className="hover:text-brand-charcoal transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-ui-border rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guests by name, email, or company..."
            className="w-full pl-10 pr-4 py-3 border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
            autoFocus
          />
        </div>

        {searching && (
          <div className="mt-3 text-sm text-ui-tertiary">Searching...</div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-3 divide-y divide-ui-border">
            {searchResults.map((result) => {
              const isCheckedIn = result.checked_in || result.checkin_id
              return (
                <div key={result.invitation_id} className="flex items-center justify-between py-3">
                  <div>
                    <button
                      onClick={() => result.contact_id && setDossierContactId(result.contact_id)}
                      className={`font-medium text-brand-charcoal text-sm ${result.contact_id ? 'hover:text-brand-terracotta hover:underline transition-colors' : ''}`}
                      disabled={!result.contact_id}
                    >
                      {result.first_name} {result.last_name}
                    </button>
                    <div className="text-xs text-ui-tertiary">
                      {result.email}
                      {result.company && ` · ${result.company}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      result.status === 'ACCEPTED' || result.status === 'CONFIRMED'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-brand-cream text-gray-600'
                    }`}>
                      {result.status}
                    </span>
                    {isCheckedIn ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <UserCheck className="w-4 h-4" />
                        Checked In
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(result)}
                        disabled={checkingIn === result.invitation_id}
                        className="px-4 py-1.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {checkingIn === result.invitation_id ? 'Checking in...' : 'Check In'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {searchQuery && !searching && searchResults.length === 0 && (
          <div className="mt-3 text-sm text-ui-tertiary text-center py-4">
            No guests found matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Not Yet Arrived — shown first (most urgent during event) */}
      {metrics && metrics.not_arrived_guests && metrics.not_arrived_guests.length > 0 && (() => {
        const notArrivedCount = metrics.not_arrived_guests.length
        // Auto: expanded if ≤3, collapsed if >4. User override takes precedence.
        const isExpanded = userToggledNotArrived
          ? (showNotArrived ?? notArrivedCount <= 3)
          : notArrivedCount <= 3
        return (
        <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
          <button
            onClick={() => { setShowNotArrived(!isExpanded); setUserToggledNotArrived(true) }}
            className="w-full px-4 py-3 border-b border-ui-border flex items-center justify-between hover:bg-brand-cream transition-colors"
          >
            <h3 className="text-sm font-semibold text-brand-charcoal">
              Not Yet Arrived ({notArrivedCount})
            </h3>
            {isExpanded
              ? <ChevronDown size={16} className="text-ui-tertiary" />
              : <ChevronRight size={16} className="text-ui-tertiary" />
            }
          </button>
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ui-border bg-brand-cream">
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Company</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Title</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary" style={{ minWidth: 130 }}>Role</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary" style={{ minWidth: 90 }}>Priority</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Tags</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Assigned To</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Table</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {metrics.not_arrived_guests.map((guest: NotArrivedGuest) => {
                    const guestTags = guest.tags || []
                    return (
                    <tr key={guest.contact_id} className="hover:bg-brand-cream transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <AvatarInitials name={guest.full_name} size={24} />
                          <button
                            onClick={() => setDossierContactId(guest.contact_id)}
                            className="font-medium text-brand-charcoal hover:text-brand-terracotta hover:underline transition-colors"
                          >
                            {guest.full_name}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ui-secondary">{guest.company || '—'}</td>
                      <td className="px-4 py-2.5 text-ui-secondary">{guest.title || '—'}</td>
                      <td className="px-4 py-2.5 text-ui-secondary">
                        {guest.guest_role ? ROLE_LABELS[guest.guest_role] || guest.guest_role : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {guest.guest_priority === 'VIP' ? (
                          <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border bg-amber-100 text-amber-800 border-amber-300">VIP</span>
                        ) : guest.guest_priority ? (
                          <span className="text-ui-secondary">{PRIORITY_LABELS[guest.guest_priority] || guest.guest_priority}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {guestTags.length > 0 && <TagBadge label={guestTags[0]} variant="default" />}
                          {guestTags.length > 1 && <span className="text-[13px] text-ui-tertiary">+{guestTags.length - 1}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ui-secondary">{guest.assigned_team_member || '—'}</td>
                      <td className="px-4 py-2.5 text-ui-secondary">
                        {guest.table_assignment ? `Table ${guest.table_assignment}` : '—'}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )
      })()}

      {/* Recent Check-ins Table */}
      {metrics && filteredCheckins.length > 0 && (
        <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-ui-border">
            <h3 className="text-sm font-semibold text-brand-charcoal">
              Recent Check-ins ({filteredCheckins.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui-border bg-brand-cream">
                  <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary w-8"></th>
                  {([
                    { key: 'time' as const, label: 'Time', align: 'text-left' },
                    { key: 'name' as const, label: 'Name', align: 'text-left' },
                    { key: 'company' as const, label: 'Company', align: 'text-left' },
                  ]).map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`${col.align} px-4 py-2.5 font-medium text-ui-tertiary cursor-pointer select-none hover:text-brand-charcoal transition-colors`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key && (
                          <span className="text-brand-terracotta text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary" style={{ minWidth: 130 }}>Role</th>
                  <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary" style={{ minWidth: 90 }}>Priority</th>
                  <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Tags</th>
                  <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Assigned To</th>
                  <th
                    onClick={() => handleSort('table')}
                    className="text-left px-4 py-2.5 font-medium text-ui-tertiary cursor-pointer select-none hover:text-brand-charcoal transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Table
                      {sortCol === 'table' && (
                        <span className="text-brand-terracotta text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-ui-tertiary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {filteredCheckins.map((checkin: EventCheckin) => {
                  const isExpanded = expandedRow === checkin.id
                  const tags = checkin.tags || []
                  return (
                    <React.Fragment key={checkin.id}>
                      <tr
                        className="hover:bg-brand-cream cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(isExpanded ? null : checkin.id)}
                      >
                        <td className="px-4 py-2.5">
                          {isExpanded
                            ? <ChevronDown size={14} className="text-ui-tertiary" />
                            : <ChevronRight size={14} className="text-ui-tertiary" />
                          }
                        </td>
                        <td className="px-4 py-2.5 text-ui-tertiary whitespace-nowrap">
                          {formatUSTime(new Date(checkin.created_at))}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <AvatarInitials name={checkin.full_name} size={24} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                checkin.contact_id && setDossierContactId(checkin.contact_id)
                              }}
                              className={`font-medium text-brand-charcoal ${checkin.contact_id ? 'hover:text-brand-terracotta hover:underline transition-colors' : ''}`}
                              disabled={!checkin.contact_id}
                            >
                              {checkin.full_name}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-ui-secondary">{checkin.company || '—'}</td>
                        <td className="px-4 py-2.5 text-ui-secondary">{checkin.title || '—'}</td>
                        <td className="px-4 py-2.5 text-ui-secondary">
                          {checkin.guest_role ? ROLE_LABELS[checkin.guest_role] || checkin.guest_role : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {checkin.guest_priority === 'VIP' ? (
                            <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border bg-amber-100 text-amber-800 border-amber-300">VIP</span>
                          ) : checkin.guest_priority ? (
                            <span className="text-ui-secondary">{PRIORITY_LABELS[checkin.guest_priority] || checkin.guest_priority}</span>
                          ) : <span className="text-ui-tertiary">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {tags.length > 0 && (
                              <TagBadge label={tags[0]} variant="default" />
                            )}
                            {tags.length > 1 && (
                              <span className="text-[13px] text-ui-tertiary">+{tags.length - 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-ui-secondary">{checkin.assigned_team_member || '—'}</td>
                        <td className="px-4 py-2.5 text-ui-secondary">
                          {checkin.table_assignment ? `Table ${checkin.table_assignment}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            checkin.source === 'WALK_IN'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {checkin.source === 'WALK_IN' ? 'Walk-in' : 'Checked In'}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="px-0 py-0">
                            <div className="border-t border-ui-border bg-brand-cream px-6 py-4 space-y-4">
                              {/* Operational info row */}
                              <div className="flex items-center gap-4 flex-wrap">
                                {checkin.notes && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-medium text-ui-tertiary">Notes:</span>
                                    <span className="text-[13px] text-ui-secondary">{checkin.notes}</span>
                                  </div>
                                )}
                                {checkin.table_assignment && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-medium text-ui-tertiary">Table:</span>
                                    <span className="text-[13px] text-ui-secondary">Table {checkin.table_assignment}</span>
                                  </div>
                                )}
                                {checkin.assigned_team_member && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-medium text-ui-tertiary">Assigned To:</span>
                                    <span className="text-[13px] text-ui-secondary">{checkin.assigned_team_member}</span>
                                  </div>
                                )}
                              </div>

                              {/* Talking Points — kept for event-day conversation prep */}
                              {checkin.talking_points && checkin.talking_points.length > 0 && (
                                <div>
                                  <h4 className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Talking Points</h4>
                                  <ul className="space-y-1">
                                    {checkin.talking_points.map((tp, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-ui-secondary">
                                        <span className="text-brand-terracotta mt-0.5">•</span>
                                        <span className="font-display italic">{tp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* View Full Profile button */}
                              {checkin.contact_id && (
                                <div className="pt-1">
                                  <button
                                    onClick={() => setDossierContactId(checkin.contact_id!)}
                                    className="px-3 py-1.5 border border-ui-border rounded-lg text-[13px] font-medium text-ui-secondary hover:bg-white transition-colors"
                                  >
                                    View Full Profile
                                  </button>
                                </div>
                              )}
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
        </div>
      )}

      {showWalkIn && (
        <WalkInForm
          eventId={eventId}
          onClose={() => setShowWalkIn(false)}
          onSuccess={() => {
            setShowWalkIn(false)
            fetchMetrics()
          }}
        />
      )}

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

// Need React import for Fragment usage
import React from 'react'
