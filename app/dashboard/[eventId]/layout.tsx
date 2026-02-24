import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import { EventTabNavigation } from '@/app/components/EventTabNavigation'
import { EventHeaderActions } from '@/app/components/EventHeaderActions'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { getDb } from '@/lib/db'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ eventId: string }>
}

type Location = {
  venue_name?: string
  street_address?: string
  city?: string
  state_province?: string
  country?: string
}

type EventData = {
  id: string | number
  title: string
  location?: Location | null
  start_date: string
  end_date?: string
  timezone: string | null
  image_url?: string | null
  event_url?: string | null
  is_private?: boolean
  approve_mode?: string
  status?: string
}

type CapacityData = {
  total_capacity: number
  seats_filled: number
  seats_remaining: number
  over_capacity: boolean
}

async function fetchEvent(eventId: string): Promise<EventData | null> {
  try {
    const db = getDb()

    const result = await db`
      SELECT
        id,
        title,
        location::text as location_raw,
        start_date,
        end_date,
        timezone,
        image_url,
        event_url,
        is_private,
        approve_mode,
        status
      FROM events
      WHERE id = ${Number(eventId)}
      LIMIT 1
    `

    if (!result || result.length === 0) {
      return null
    }

    const event = result[0]
    const location = event.location_raw ? JSON.parse(event.location_raw) : null

    return {
      id: event.id,
      title: event.title,
      location: location,
      start_date: event.start_date,
      end_date: event.end_date,
      timezone: event.timezone,
      image_url: event.image_url,
      event_url: event.event_url,
      is_private: event.is_private,
      approve_mode: event.approve_mode,
      status: event.status,
    }
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return null
  }
}

async function fetchCapacity(eventId: string): Promise<CapacityData> {
  try {
    const db = getDb()

    const eventResult = await db`
      SELECT total_capacity
      FROM events
      WHERE id = ${Number(eventId)}
      LIMIT 1
    `

    if (!eventResult || eventResult.length === 0) {
      return {
        total_capacity: 0,
        seats_filled: 0,
        seats_remaining: 0,
        over_capacity: false,
      }
    }

    const countResult = await db`
      SELECT COUNT(*) as count
      FROM campaign_invitations
      WHERE event_id = ${Number(eventId)}
        AND status = 'ACCEPTED'
    `

    const seatsFilled = Number(countResult[0]?.count || 0)
    const totalCapacity = eventResult[0].total_capacity || 0
    const seatsRemaining = Math.max(0, totalCapacity - seatsFilled)
    const overCapacity = seatsFilled > totalCapacity

    return {
      total_capacity: totalCapacity,
      seats_filled: seatsFilled,
      seats_remaining: seatsRemaining,
      over_capacity: overCapacity,
    }
  } catch (error) {
    console.error('Failed to fetch capacity:', error)
    return {
      total_capacity: 0,
      seats_filled: 0,
      seats_remaining: 0,
      over_capacity: false,
    }
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatLocation(location?: Location | null): string {
  if (!location) return 'No location set'
  const parts = [
    location.venue_name,
    location.city,
    location.state_province,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'No location set'
}

export default async function EventLayout({ children, params }: LayoutProps) {
  const { eventId } = await params

  const [event, capacity] = await Promise.all([
    fetchEvent(eventId),
    fetchCapacity(eventId),
  ])

  if (!event) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-24">
        <div className="max-w-md text-center bg-white rounded-card shadow-card p-8">
          <h1 className="font-display text-2xl font-semibold text-brand-charcoal mb-4">Event not found</h1>
          <p className="text-ui-secondary mb-8 leading-relaxed">
            The event you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-brand-terracotta hover:text-brand-terracotta/70 font-medium transition-colors"
          >
            <span>←</span>
            <span>Back to Events</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <DashboardHeader activeNav="events" />

      {/* Content with top padding for fixed header */}
      <div className="pt-[73px]">
        {/* Event Header */}
        <div className="border-b border-ui-border bg-white">
          <div className="px-8 py-6">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-start gap-6 flex-1 min-w-0">
                {/* Event Image */}
                {event.image_url ? (
                  <div className="shrink-0">
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-card object-cover border border-ui-border"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 shrink-0 rounded-card bg-gradient-to-br from-brand-terracotta/80 to-brand-forest flex items-center justify-center">
                    <span className="font-display text-white/60 text-2xl font-bold">
                      {event.title.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-sm text-ui-tertiary hover:text-brand-terracotta transition-colors mb-3 font-medium"
                  >
                    <ChevronLeft size={16} />
                    <span>Events</span>
                  </Link>
                  <h1 className="font-display text-2xl font-bold text-brand-charcoal mb-2 tracking-tight">
                    {event.title}
                  </h1>
                  <p className="text-sm text-ui-secondary">
                    {formatLocation(event.location)} · {formatDate(event.start_date)}
                  </p>
                </div>
              </div>

              {/* Right Side: Capacity + Edit Button */}
              <EventHeaderActions
                eventId={eventId}
                capacityFilled={capacity.seats_filled}
                totalCapacity={capacity.total_capacity}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-ui-border bg-white">
          <div className="px-8">
            <EventTabNavigation eventId={eventId} />
          </div>
        </div>

        {/* Tab Content - Full Width */}
        <div className="px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  )
}
