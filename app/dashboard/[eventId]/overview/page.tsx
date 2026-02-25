'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, FileText, Armchair, BarChart3 } from 'lucide-react'
import { FunnelStatsRow } from '@/app/components/overview/FunnelStatsRow'
import { NeedsAttentionSection } from '@/app/components/overview/NeedsAttentionSection'
import { ActivityFeed } from '@/app/components/overview/ActivityFeed'
import { QuickActions } from '@/app/components/overview/QuickActions'

interface FunnelData {
  pool: number
  scored: number
  qualified: number
  selected: number
  confirmed: number
}

interface AttentionItem {
  type: string
  count: number
  label: string
  action?: string
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
}

export default function OverviewPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [funnel, setFunnel] = useState<FunnelData>({ pool: 0, scored: 0, qualified: 0, selected: 0, confirmed: 0 })
  const [needsAttention, setNeedsAttention] = useState<AttentionItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [meta, setMeta] = useState<OverviewMeta>({ total_capacity: 0, has_objectives: false, has_scored_contacts: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/events/${eventId}/overview-stats`)
        if (res.ok) {
          const data = await res.json()
          setFunnel(data.funnel)
          setNeedsAttention(data.needs_attention)
          setActivity(data.activity)
          setMeta(data.meta)
        } else {
          setError('Failed to load overview data')
        }
      } catch (err) {
        console.error('Failed to fetch overview:', err)
        setError('Failed to connect to server')
      } finally {
        setLoading(false)
      }
    }
    fetchOverview()
  }, [eventId])

  // Determine pending review from needs_attention items
  const hasPendingReview = needsAttention.some(i => i.type === 'pending_review' && i.count > 0)

  // Check if all quick actions would be hidden (event is fully set up)
  const allSetUp = meta.has_objectives && meta.has_scored_contacts && !hasPendingReview

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading overview...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <div className="text-ui-secondary text-sm font-medium">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-brand-terracotta hover:bg-brand-terracotta/5 rounded-lg transition-colors"
        >
          Retry
        </button>
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

      {/* 1. Funnel Stats — "How is my guest list shaping up?" */}
      <FunnelStatsRow funnel={funnel} totalCapacity={meta.total_capacity} eventId={eventId} />

      {/* 2. Needs Attention */}
      <NeedsAttentionSection items={needsAttention} eventId={eventId} />

      {/* 3. Quick Actions — "What should I do next?" */}
      <QuickActions
        eventId={eventId}
        hasObjectives={meta.has_objectives}
        hasScoredContacts={meta.has_scored_contacts}
        hasPendingGuests={hasPendingReview}
        isEventDay={false}
      />

      {/* Next steps guidance (when all basic setup is done) */}
      {allSetUp && needsAttention.length === 0 && (
        <div className="bg-white rounded-card shadow-card p-5">
          <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Next Steps</h3>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href={`/dashboard/${eventId}/briefings`}
              className="flex items-center gap-2.5 p-3 bg-brand-cream rounded-lg hover:bg-brand-cream/70 transition-colors"
            >
              <FileText size={16} className="text-brand-terracotta shrink-0" />
              <div>
                <div className="text-sm font-medium text-brand-charcoal">Prepare Briefings</div>
                <div className="text-[11px] text-ui-tertiary">Talking points for your {funnel.confirmed} confirmed guests</div>
              </div>
            </Link>
            <Link
              href={`/dashboard/${eventId}/seating`}
              className="flex items-center gap-2.5 p-3 bg-brand-cream rounded-lg hover:bg-brand-cream/70 transition-colors"
            >
              <Armchair size={16} className="text-brand-forest shrink-0" />
              <div>
                <div className="text-sm font-medium text-brand-charcoal">Plan Seating</div>
                <div className="text-[11px] text-ui-tertiary">AI-suggested arrangements and introductions</div>
              </div>
            </Link>
            <Link
              href={`/dashboard/${eventId}/analytics`}
              className="flex items-center gap-2.5 p-3 bg-brand-cream rounded-lg hover:bg-brand-cream/70 transition-colors"
            >
              <BarChart3 size={16} className="text-blue-600 shrink-0" />
              <div>
                <div className="text-sm font-medium text-brand-charcoal">View Analytics</div>
                <div className="text-[11px] text-ui-tertiary">Funnel performance and pipeline attribution</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Activity Feed */}
      <div>
        <h2 className="font-display text-lg font-semibold text-brand-charcoal mb-4">Recent Activity</h2>
        <ActivityFeed activities={activity} />
      </div>
    </div>
  )
}
