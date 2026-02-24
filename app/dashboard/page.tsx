'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CreateEventModal } from '@/app/components/CreateEventModal'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { Calendar, MapPin, Users, Lock, Plus, Search, X, Mail, CheckCircle2, Clock, UserCheck } from 'lucide-react'

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
  // Legacy fields
  name?: string
  city?: string | null
  starts_at?: string
}

type TabFilter = 'upcoming' | 'past' | 'draft'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
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
      if (activeTab === 'draft') {
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
      <main className="min-h-screen bg-brand-cream p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-ui-tertiary text-sm font-medium">Loading events...</div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-brand-cream p-8">
        <div className="max-w-7xl mx-auto">
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
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      {/* DashboardHeader */}
      <DashboardHeader activeNav="events" rightSlot={<button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta"><Plus size={16} />New Event</button>} />

      {/* Main Content with top padding to account for fixed header */}
      <div className="pt-[73px]">
        <div className="max-w-7xl mx-auto p-8 space-y-6">

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-ui-border bg-white rounded-t-lg px-6">
          {[
            { key: 'upcoming' as TabFilter, label: 'Upcoming' },
            { key: 'past' as TabFilter, label: 'Past' },
            { key: 'draft' as TabFilter, label: 'Drafts' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-3 text-sm font-semibold border-b-2 transition-colors
                ${activeTab === tab.key
                  ? 'border-brand-terracotta text-brand-terracotta'
                  : 'border-transparent text-ui-tertiary hover:text-brand-charcoal'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, location, or URL..."
              className="w-full pl-10 pr-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
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
                  <div className="p-6">
                    <div className="flex gap-6">
                      {/* Square Event Image */}
                      {event.image_url ? (
                        <div className="w-40 h-40 shrink-0 bg-brand-cream rounded-lg overflow-hidden">
                          <Image
                            src={event.image_url}
                            alt={event.title ?? event.name ?? 'Event'}
                            width={160}
                            height={160}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-40 shrink-0 bg-gradient-to-br from-brand-terracotta/80 to-brand-forest rounded-lg flex items-center justify-center">
                          <Calendar className="text-white/30" size={48} />
                        </div>
                      )}

                      {/* Event Content */}
                      <div className="flex-1 space-y-4 min-w-0">
                        {/* Status & Private Badge */}
                        <div className="flex items-center justify-between gap-3">
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
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm text-ui-secondary">
                            <Calendar className="shrink-0 mt-0.5" size={14} />
                            <span>{formatDateTime(event.start_date ?? event.starts_at ?? '')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-ui-secondary">
                            <MapPin className="shrink-0 mt-0.5" size={14} />
                            <span>{locationDisplay}</span>
                          </div>
                        </div>

                        {/* Operational Metrics */}
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-ui-border">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                              <Mail className="text-brand-terracotta" size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-ui-tertiary uppercase mb-0.5">
                                Invited
                              </div>
                              <div className="text-lg font-bold text-brand-terracotta">—</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="text-emerald-700" size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-ui-tertiary uppercase mb-0.5">
                                Confirmed
                              </div>
                              <div className="text-lg font-bold text-emerald-700">—</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center shrink-0">
                              <Clock className="text-amber-700" size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-ui-tertiary uppercase mb-0.5">
                                Pending
                              </div>
                              <div className="text-lg font-bold text-amber-700">—</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded bg-brand-cream flex items-center justify-center shrink-0">
                              <Users className="text-ui-secondary" size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-ui-tertiary uppercase mb-0.5">
                                Capacity
                              </div>
                              <div className="text-lg font-bold text-ui-secondary">—</div>
                            </div>
                          </div>
                        </div>

                        {/* View Details Link */}
                        <div className="pt-4 border-t border-ui-border">
                          <div className="text-sm font-semibold text-brand-terracotta">
                            Manage Event →
                          </div>
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

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
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
