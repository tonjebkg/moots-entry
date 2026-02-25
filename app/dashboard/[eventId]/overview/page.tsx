'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FunnelStatsRow } from '@/app/components/overview/FunnelStatsRow'
import { NeedsAttentionSection } from '@/app/components/overview/NeedsAttentionSection'
import { ActivityFeed } from '@/app/components/overview/ActivityFeed'
import { QuickActions } from '@/app/components/overview/QuickActions'

interface FunnelData {
  evaluated: number
  qualified: number
  invited: number
  confirmed: number
}

interface AttentionItem {
  type: string
  count: number
  label: string
}

interface ActivityItem {
  actor: string
  action: string
  timestamp: string
}

interface OverviewMeta {
  total_capacity: number
  has_objectives: boolean
  has_scored_contacts: boolean
  pending_guests: boolean
}

export default function OverviewPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [funnel, setFunnel] = useState<FunnelData>({ evaluated: 0, qualified: 0, invited: 0, confirmed: 0 })
  const [needsAttention, setNeedsAttention] = useState<AttentionItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [meta, setMeta] = useState<OverviewMeta>({ total_capacity: 0, has_objectives: false, has_scored_contacts: false, pending_guests: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true)
        const res = await fetch(`/api/events/${eventId}/overview-stats`)
        if (res.ok) {
          const data = await res.json()
          setFunnel(data.funnel)
          setNeedsAttention(data.needs_attention)
          setActivity(data.activity)
          setMeta(data.meta)
        }
      } catch (err) {
        console.error('Failed to fetch overview:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOverview()
  }, [eventId])

  // Determine if event is today
  const isEventDay = false // Would need event start_date to determine; layout provides this

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading overview...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-charcoal tracking-tight mb-2">Event Overview</h1>
        <p className="text-sm text-ui-secondary">Intelligence-first snapshot of your event pipeline</p>
      </div>

      {/* Quick Actions */}
      <QuickActions
        eventId={eventId}
        hasObjectives={meta.has_objectives}
        hasScoredContacts={meta.has_scored_contacts}
        hasPendingGuests={meta.pending_guests}
        isEventDay={isEventDay}
      />

      {/* Funnel Stats */}
      <FunnelStatsRow funnel={funnel} />

      {/* Needs Attention */}
      <NeedsAttentionSection items={needsAttention} eventId={eventId} />

      {/* Activity Feed */}
      <div>
        <h2 className="font-display text-lg font-semibold text-brand-charcoal mb-4">Recent Activity</h2>
        <ActivityFeed activities={activity} />
      </div>
    </div>
  )
}
