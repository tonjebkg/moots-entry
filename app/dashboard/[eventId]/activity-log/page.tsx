'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Search, X, ChevronDown, Sparkles, Loader2 } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActivityLogEntry {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string
  actor_avatar: string | null
  action: string
  entity_type: string
  entity_id: string | null
  new_value: any
  metadata: any
  created_at: string
}

interface Actor {
  id: string
  name: string
  avatar_url: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

// ─── Action Formatting ─────────────────────────────────────────────────────

const ACTION_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  checkin:    { label: 'Check-in',   className: 'bg-orange-50 text-[#B05C3B] border border-orange-200' },
  campaign:   { label: 'Invitation', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  invitation: { label: 'Invitation', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  scoring:    { label: 'Scoring',    className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  team:       { label: 'Team',       className: 'bg-teal-50 text-teal-700 border border-teal-200' },
  event:      { label: 'Settings',   className: 'bg-gray-50 text-gray-600 border border-gray-200' },
  note:       { label: 'Note',       className: 'bg-gray-50 text-gray-600 border border-gray-200' },
  briefing:   { label: 'Briefing',   className: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  followup:   { label: 'Follow-Up',  className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  targeting:  { label: 'Targeting',  className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  ai:         { label: 'AI Action',  className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  messaging:  { label: 'Messaging',  className: 'bg-green-50 text-green-700 border border-green-200' },
  guest:      { label: 'Guest',      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  follow_up:  { label: 'Follow-Up',  className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
}

const ACTION_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'checkin', label: 'Check-in' },
  { value: 'campaign', label: 'Campaigns' },
  { value: 'invitation', label: 'Invitations' },
  { value: 'scoring', label: 'Scoring' },
  { value: 'team', label: 'Team' },
  { value: 'event', label: 'Event Settings' },
  { value: 'note', label: 'Notes' },
  { value: 'briefing', label: 'Briefings' },
  { value: 'followup', label: 'Follow-Up' },
  { value: 'targeting', label: 'Targeting' },
  { value: 'ai', label: 'AI Actions' },
  { value: 'guest', label: 'Guest' },
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
]

function formatAction(entry: ActivityLogEntry): { description: string; targetName?: string } {
  const action = entry.action
  const newVal = entry.new_value || {}

  if (action === 'checkin.guest') return { description: `Checked in ${newVal.guest_name || 'a guest'}` }
  if (action === 'checkin.walkin') return { description: `Registered walk-in ${newVal.guest_name || 'guest'}` }
  if (action === 'campaign.created') return { description: `Created campaign "${newVal.name || 'campaign'}"` }
  if (action === 'invitation.sent') return { description: `Sent invitation to ${newVal.guest_name || 'guest'}` }
  if (action === 'invitation.response') return { description: `${newVal.guest_name || 'Guest'} ${newVal.response || 'responded'}` }
  if (action === 'team.assigned') return { description: `Assigned ${newVal.guest_name || `${newVal.count || ''} guests`} to ${newVal.assigned_to || 'team member'}` }
  if (action === 'scoring.completed') return { description: `Scored ${newVal.contacts_scored || 'contacts'} contacts` }
  if (action === 'event.updated') return { description: 'Updated event details' }
  if (action === 'event.capacity_updated') return { description: `Updated capacity to ${newVal.total_capacity || ''}` }
  if (action === 'event.created') return { description: `Created event "${newVal.event_title || ''}"` }
  if (action === 'note.added') return { description: `Added a note on ${newVal.contact_name || 'a contact'}` }
  if (action === 'briefing.generated') return { description: `Generated ${newVal.briefing_type || ''} briefing` }
  if (action === 'briefing.viewed') return { description: `Viewed ${newVal.briefing_type || ''} briefing` }
  if (action === 'followup.created') return { description: 'Created follow-up sequence' }
  if (action === 'followup.updated') return { description: `Updated follow-up status${newVal.status ? ` to ${newVal.status.replace(/_/g, ' ')}` : ''}` }
  if (action === 'targeting.created') return { description: `Added targeting criterion "${newVal.criterion_name || ''}"` }
  if (action === 'targeting.bulk_upserted') return { description: `Updated targeting criteria` }
  if (action === 'guest.imported') return { description: newVal.description || 'Imported contacts' }
  if (action === 'guest.moved') return { description: newVal.description || 'Moved contacts' }

  // AI actions
  if (action.startsWith('ai.')) {
    const aiVal = entry.new_value || {}
    if (aiVal.headline) return { description: aiVal.headline }
    return { description: `AI ${action.replace('ai.', '').replace(/_/g, ' ')} action` }
  }

  // Fallback
  return { description: action.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
}

function getActionBadgeKey(action: string): string {
  return action.split('.')[0]
}

// ─── Avatar Component ──────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-[#B05C3B]', 'bg-[#2D6A4F]', 'bg-blue-600', 'bg-purple-600',
  'bg-amber-600', 'bg-teal-600', 'bg-rose-600', 'bg-indigo-600',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

function ActorAvatar({ entry }: { entry: ActivityLogEntry }) {
  const isAI = entry.action.startsWith('ai.') || entry.actor_name === 'Moots Intelligence'

  if (isAI) {
    return (
      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-purple-600" />
      </div>
    )
  }

  if (entry.actor_avatar) {
    return (
      <img
        src={entry.actor_avatar}
        alt={entry.actor_name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    )
  }

  const color = getAvatarColor(entry.actor_name)
  return (
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0`}>
      <span className="text-white text-xs font-semibold">{getInitials(entry.actor_name)}</span>
    </div>
  )
}

// ─── Relative Time ─────────────────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fullTimestamp(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── Day Grouping ──────────────────────────────────────────────────────────

function getDayKey(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-CA') // YYYY-MM-DD
}

function getDayLabel(dayKey: string): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayKey = today.toLocaleDateString('en-CA')
  const yesterdayKey = yesterday.toLocaleDateString('en-CA')

  if (dayKey === todayKey) return 'Today'
  if (dayKey === yesterdayKey) return 'Yesterday'

  return new Date(dayKey + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Log Entry Component ───────────────────────────────────────────────────

function LogEntry({ entry }: { entry: ActivityLogEntry }) {
  const { description } = formatAction(entry)
  const badgeKey = getActionBadgeKey(entry.action)
  const badge = ACTION_BADGE_CONFIG[badgeKey]

  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-brand-cream/50 transition-colors">
      <ActorAvatar entry={entry} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-brand-charcoal">
            {entry.actor_name}
          </span>
          <span className="text-sm text-ui-secondary">
            {description}
          </span>
          <span
            className="text-xs text-ui-tertiary ml-auto shrink-0"
            title={fullTimestamp(entry.created_at)}
          >
            {relativeTime(entry.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {badge && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Filter Dropdown ───────────────────────────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-ui-border rounded-lg px-3 py-2 pr-8 text-sm text-brand-charcoal font-medium cursor-pointer hover:border-gray-400 focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary pointer-events-none" />
    </div>
  )
}

// ─── Main Page Component ───────────────────────────────────────────────────

export default function ActivityLogPage() {
  const params = useParams()
  const eventId = params.eventId as string

  // State
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [actors, setActors] = useState<Actor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actorFilter, setActorFilter] = useState('ALL')
  const [actionTypeFilter, setActionTypeFilter] = useState('ALL')
  const [dateRange, setDateRange] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, total_pages: 0 })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
    setEntries([])
  }, [actorFilter, actionTypeFilter, dateRange, debouncedSearch])

  // Fetch function
  const fetchEntries = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '50' })

      if (actorFilter !== 'ALL') params.set('actor_id', actorFilter)
      if (actionTypeFilter !== 'ALL') params.set('action_type', actionTypeFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)

      // Date range
      if (dateRange === 'today') {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        params.set('from', start.toISOString())
      } else if (dateRange === '7days') {
        const start = new Date()
        start.setDate(start.getDate() - 7)
        params.set('from', start.toISOString())
      } else if (dateRange === '30days') {
        const start = new Date()
        start.setDate(start.getDate() - 30)
        params.set('from', start.toISOString())
      }

      const res = await fetch(`/api/events/${eventId}/activity-log?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()

      if (append) {
        setEntries(prev => [...prev, ...data.entries])
      } else {
        setEntries(data.entries)
        setActors(data.actors)
      }
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch activity log:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [eventId, actorFilter, actionTypeFilter, dateRange, debouncedSearch])

  useEffect(() => {
    fetchEntries(page, page > 1)
  }, [page, fetchEntries])

  // Group entries by day
  const groupedEntries = useMemo(() => {
    const groups: { dayKey: string; label: string; entries: ActivityLogEntry[] }[] = []
    const groupMap = new Map<string, ActivityLogEntry[]>()

    for (const entry of entries) {
      const dayKey = getDayKey(entry.created_at)
      if (!groupMap.has(dayKey)) {
        groupMap.set(dayKey, [])
      }
      groupMap.get(dayKey)!.push(entry)
    }

    for (const [dayKey, dayEntries] of groupMap) {
      groups.push({
        dayKey,
        label: getDayLabel(dayKey),
        entries: dayEntries,
      })
    }

    return groups
  }, [entries])

  // Check if filters are active
  const hasFilters = actorFilter !== 'ALL' || actionTypeFilter !== 'ALL' || dateRange !== 'all' || searchQuery !== ''

  function clearFilters() {
    setActorFilter('ALL')
    setActionTypeFilter('ALL')
    setDateRange('all')
    setSearchQuery('')
  }

  // Build actor options
  const actorOptions = useMemo(() => {
    const opts = [{ value: 'ALL', label: 'All Team Members' }]
    for (const actor of actors) {
      opts.push({ value: actor.id, label: actor.name })
    }
    return opts
  }, [actors])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-brand-charcoal tracking-tight">
          Activity Log
        </h2>
        <p className="text-sm text-ui-tertiary mt-1">
          Track all actions and changes for this event
        </p>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-[73px] z-20 bg-white border border-ui-border rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterDropdown
            label="Team Member"
            value={actorFilter}
            options={actorOptions}
            onChange={setActorFilter}
          />
          <FilterDropdown
            label="Action Type"
            value={actionTypeFilter}
            options={ACTION_TYPE_OPTIONS}
            onChange={setActionTypeFilter}
          />
          <FilterDropdown
            label="Date Range"
            value={dateRange}
            options={DATE_RANGE_OPTIONS}
            onChange={setDateRange}
          />

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions..."
              className="w-full pl-9 pr-4 py-2 border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-ui-tertiary hover:text-brand-charcoal transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-ui-tertiary animate-spin" />
          <span className="ml-2 text-sm text-ui-tertiary font-medium">Loading activity log...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <div className="bg-white border border-ui-border rounded-xl py-16 text-center">
          <div className="text-ui-tertiary text-sm">
            {hasFilters
              ? 'No activity found matching your filters.'
              : 'No activity recorded for this event yet.'}
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-brand-terracotta hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Activity Log Feed */}
      {!loading && groupedEntries.length > 0 && (
        <div className="bg-white border border-ui-border rounded-xl overflow-hidden">
          {groupedEntries.map((group, groupIdx) => (
            <div key={group.dayKey}>
              {/* Day Header */}
              <div
                className={`px-4 py-2.5 bg-brand-cream/60 border-b border-ui-border ${
                  groupIdx > 0 ? 'border-t' : ''
                }`}
              >
                <span className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {/* Entries */}
              <div className="divide-y divide-ui-border/50">
                {group.entries.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && pagination.page < pagination.total_pages && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage(prev => prev + 1)}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-white border border-ui-border rounded-lg text-sm font-medium text-brand-charcoal hover:bg-brand-cream transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              `Load more (${pagination.total - entries.length} remaining)`
            )}
          </button>
        </div>
      )}

      {/* Total count */}
      {!loading && entries.length > 0 && (
        <div className="text-center text-xs text-ui-tertiary pb-4">
          Showing {entries.length} of {pagination.total} activity entries
        </div>
      )}
    </div>
  )
}
