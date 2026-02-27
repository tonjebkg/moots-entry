'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { FunnelStatsRow } from '@/app/components/overview/FunnelStatsRow'
import { NeedsAttentionSection } from '@/app/components/overview/NeedsAttentionSection'
import { ActivityFeed } from '@/app/components/overview/ActivityFeed'
import { AgentActivityFeed } from '@/app/components/overview/AgentActivityFeed'
import { WhileYouWereAway } from '@/app/components/WhileYouWereAway'
import { DossierPanel } from '@/app/components/DossierPanel'
import type { AgentActivityEntry } from '@/lib/agent/activity'

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
  contact_id?: string | null
}

interface OverviewMeta {
  total_capacity: number
  has_objectives: boolean
  has_scored_contacts: boolean
  is_event_day: boolean
}

const LAST_VISIT_KEY = 'moots_last_visit_'

export default function OverviewPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [funnel, setFunnel] = useState<FunnelData>({ pool: 0, scored: 0, qualified: 0, selected: 0, confirmed: 0 })
  const [needsAttention, setNeedsAttention] = useState<AttentionItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [agentActivity, setAgentActivity] = useState<AgentActivityEntry[]>([])
  const [recentAgentActivity, setRecentAgentActivity] = useState<AgentActivityEntry[]>([])
  const [meta, setMeta] = useState<OverviewMeta>({ total_capacity: 0, has_objectives: false, has_scored_contacts: false, is_event_day: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)

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
          setAgentActivity(data.agent_activity || [])
          setMeta(data.meta)

          // Compute "While You Were Away" from agent activity
          const lastVisitKey = `${LAST_VISIT_KEY}${eventId}`
          const lastVisit = localStorage.getItem(lastVisitKey)
          if (lastVisit && data.agent_activity?.length > 0) {
            const lastVisitDate = new Date(lastVisit)
            const recent = (data.agent_activity as AgentActivityEntry[]).filter(
              a => new Date(a.created_at) > lastVisitDate
            )
            setRecentAgentActivity(recent)
          }

          // Update last visit
          localStorage.setItem(lastVisitKey, new Date().toISOString())
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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-charcoal tracking-tight mb-1">Event Overview</h1>
        <p className="text-base text-ui-secondary">Intelligence-first snapshot of your event pipeline</p>
      </div>

      {/* 0. While You Were Away — shows agent work since last visit */}
      <WhileYouWereAway activities={recentAgentActivity} />

      {/* 1. Funnel Stats — "How is my guest list shaping up?" */}
      <FunnelStatsRow funnel={funnel} totalCapacity={meta.total_capacity} eventId={eventId} />

      {/* 2. Needs Attention */}
      <NeedsAttentionSection items={needsAttention} eventId={eventId} />

      {/* 3. Activity Feeds — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="max-h-[600px] overflow-y-auto">
          <AgentActivityFeed activities={agentActivity} />
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <ActivityFeed
            activities={activity}
            onContactClick={(contactId) => setDossierContactId(contactId)}
          />
        </div>
      </div>

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
