'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CreateEventWizard } from '@/app/components/CreateEventWizard'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { Calendar, MapPin, Users, Lock, Plus, Search, X } from 'lucide-react'
import { formatUSDate as formatUSDateFn, formatUSDateTime as formatUSDateTimeFn } from '@/lib/datetime'

type ApproveMode = 'MANUAL' | 'AUTO'
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETE' | 'CANCELLED'

type Location = {
  venue_name?: string
  street_address?: string
  city?: string
  state_province?: string
  country?: string
}

type Host = { name: string; url?: string | null }
type Sponsor = {
  title: string
  subtitle?: string
  url?: string
  logo_url?: string
  description?: string
}

type EventRow = {
  id: string | number
  title: string
  location?: Location | string | null
  start_date: string
  end_date?: string
  timezone: string | null
  image_url?: string | null
  event_url?: string | null
  hosts?: Host[] | null
  sponsors?: Sponsor[] | null
  is_private?: boolean
  approve_mode?: ApproveMode
  status?: EventStatus
  created_at?: string
  updated_at?: string
  total_capacity?: number | null
  invited_count?: number
  confirmed_count?: number
  pending_count?: number
  // Legacy fields
  name?: string
  city?: string | null
  starts_at?: string
}

type TabFilter = 'all' | 'upcoming' | 'past' | 'draft'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return formatUSDateFn(d)
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return formatUSDateTimeFn(d)
}

function getStatusColor(status: EventStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-ui-tertiary border border-gray-200'
    case 'PUBLISHED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'COMPLETE':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border border-red-200'
    default:
      return 'bg-gray-100 text-ui-tertiary border border-gray-200'
  }
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL')

  async function fetchEvents() {
    try {
      const res = await fetch(`/api/events?t=${Date.now()}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err: any) {
      console.error('Failed to load events:', err)
      setError(err.message || 'Failed to load events')
    }
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        await fetchEvents()
      } catch (err: any) {
        if (cancelled) return
        console.error('Failed to load events:', err)
        setError(err.message || 'Failed to load events')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Filter events by tab and status
  const filteredEvents = events
    .filter(e => {
      const now = new Date()
      const eventDate = new Date(e.start_date ?? e.starts_at ?? '')
      const isDraft = (e.status ?? 'DRAFT') === 'DRAFT'
      const isPast = eventDate < now

      // Tab filtering
      if (activeTab === 'all') {
        return true
      } else if (activeTab === 'draft') {
        return isDraft
      } else if (activeTab === 'past') {
        return !isDraft && isPast
      } else {
        // upcoming
        return !isDraft && !isPast
      }
    })
    .filter(e => {
      // Status filtering
      if (statusFilter !== 'ALL') {
        return (e.status ?? 'DRAFT') === statusFilter
      }
      return true
    })
    .filter(e => {
      // Search filtering
      if (!searchQuery.trim()) return true
      const term = searchQuery.toLowerCase()
      const locationStr =
        typeof e.location === 'object'
          ? (e.location?.city ?? '')
          : (e.location ?? e.city ?? '')
      return (
        (e.title ?? e.name ?? '').toLowerCase().includes(term) ||
        locationStr.toLowerCase().includes(term) ||
        (e.event_url ?? '').toLowerCase().includes(term)
      )
    })
    .sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.start_date ?? a.starts_at ?? '').getTime()
      const dateB = new Date(b.start_date ?? b.starts_at ?? '').getTime()

      if (activeTab === 'upcoming') {
        return dateA - dateB // Nearest first
      } else {
        return dateB - dateA // Most recent first
      }
    })

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream px-8 py-8">
        <div className="text-ui-tertiary text-sm font-medium">Loading events...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-brand-cream px-8 py-8">
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-700 mb-2">Error</h1>
          <p className="text-ui-secondary mb-4">{error}</p>
          <Link
            href="/"
            className="text-brand-terracotta hover:text-brand-terracotta/70 font-medium transition-colors"
          >
            Return home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <DashboardHeader activeNav="events" />

      {/* Main Content with top padding to account for fixed header */}
      <div className="pt-[73px]">
        <div className="px-8 py-8 space-y-6">

        {/* Page Title + New Event Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-charcoal">Events</h1>
            <p className="text-sm text-ui-tertiary mt-1">
              {events.length} event{events.length !== 1 ? 's' : ''} in your workspace
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta"
          >
            <Plus size={16} />
            New Event
          </button>
        </div>

        {/* Tabs (pill toggle) + Filters on same row */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-brand-cream rounded-lg p-1">
            {[
              { key: 'all' as TabFilter, label: 'All' },
              { key: 'upcoming' as TabFilter, label: 'Upcoming' },
              { key: 'past' as TabFilter, label: 'Past' },
              { key: 'draft' as TabFilter, label: 'Drafts' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-brand-charcoal shadow-sm'
                    : 'text-ui-tertiary hover:text-brand-charcoal'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-64 pl-10 pr-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'ALL')}
            className="px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="COMPLETE">Complete</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('ALL')
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70 transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Events Grid - 2 columns max */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white border border-ui-border rounded-lg p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-cream flex items-center justify-center">
              <Calendar className="text-ui-tertiary" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-brand-charcoal mb-2">
              {searchQuery || statusFilter !== 'ALL' ? 'No events found' : 'No events yet'}
            </h3>
            <p className="text-sm text-ui-tertiary mb-6">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first event'}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta mx-auto"
              >
                <Plus size={16} />
                Create Event
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event) => {
              const locationDisplay =
                typeof event.location === 'object'
                  ? [
                      event.location?.city,
                      event.location?.state_province,
                      event.location?.country,
                    ]
                      .filter(Boolean)
                      .join(', ')
                  : event.location || event.city || '—'

              return (
                <Link
                  key={event.id}
                  href={`/dashboard/${event.id}`}
                  className="bg-white border border-ui-border rounded-card shadow-card overflow-hidden hover:border-brand-terracotta hover:shadow-sm transition-all"
                >
                  <div className="p-5">
                    <div className="flex gap-5">
                      {/* Square Event Image */}
                      {event.image_url ? (
                        <div className="w-28 h-28 shrink-0 bg-brand-cream rounded-lg overflow-hidden">
                          <Image
                            src={event.image_url}
                            alt={event.title ?? event.name ?? 'Event'}
                            width={112}
                            height={112}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-28 shrink-0 bg-gradient-to-br from-brand-terracotta/80 to-brand-forest rounded-lg flex items-center justify-center">
                          <Calendar className="text-white/30" size={36} />
                        </div>
                      )}

                      {/* Event Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="space-y-2">
                          {/* Status & Private Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                                event.status ?? 'DRAFT'
                              )}`}
                            >
                              {event.status ?? 'DRAFT'}
                            </span>
                            {event.is_private && (
                              <span className="flex items-center gap-1 text-amber-600 text-xs font-medium" title="Private event">
                                <Lock size={12} />
                                Private
                              </span>
                            )}
                          </div>

                          {/* Event Title */}
                          <h3 className="text-lg font-semibold text-brand-charcoal leading-tight">
                            {event.title ?? event.name}
                          </h3>

                          {/* Event Details */}
                          <div className="flex items-center gap-4 text-sm text-ui-secondary">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="shrink-0" size={13} />
                              {formatDateTime(event.start_date ?? event.starts_at ?? '')}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="shrink-0" size={13} />
                              {locationDisplay}
                            </span>
                          </div>
                        </div>

                        {/* Compact Inline Stats */}
                        <div className="flex items-center gap-1 text-xs text-ui-tertiary pt-2">
                          <span className="font-semibold text-brand-terracotta">{event.invited_count ?? 0}</span> invited
                          <span className="mx-1">&middot;</span>
                          <span className="font-semibold text-emerald-700">{event.confirmed_count ?? 0}</span> confirmed
                          <span className="mx-1">&middot;</span>
                          <span className="font-semibold text-amber-700">{event.pending_count ?? 0}</span> pending
                          <span className="mx-1">&middot;</span>
                          <Users size={12} className="inline shrink-0" />
                          <span className="font-semibold text-ui-secondary">{event.total_capacity ?? '—'}</span> capacity
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {/* Create Event Wizard */}
      {showCreateModal && (
        <CreateEventWizard
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setSearchQuery('')
            fetchEvents()
          }}
        />
      )}
    </main>
  )
}
