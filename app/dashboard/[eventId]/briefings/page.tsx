'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Plus, Sparkles, AlertCircle, ArrowRight } from 'lucide-react'
import { BriefingCard } from '@/app/components/BriefingCard'
import { BriefingViewer } from '@/app/components/BriefingViewer'
import { AgentThinking, THINKING_STEPS } from '@/app/components/ui/AgentThinking'
import type { BriefingPacket, BriefingType } from '@/types/phase3'

export default function BriefingsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const [briefings, setBriefings] = useState<BriefingPacket[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initialFilter = searchParams.get('type') as BriefingType | 'ALL' | null
  const [typeFilter, setTypeFilter] = useState<BriefingType | 'ALL'>(
    initialFilter && ['ALL', 'PRE_EVENT', 'MORNING', 'END_OF_DAY'].includes(initialFilter)
      ? initialFilter
      : 'ALL'
  )

  async function fetchBriefings() {
    try {
      const res = await fetch(`/api/events/${eventId}/briefings`)
      if (res.ok) {
        const data = await res.json()
        setBriefings(data.briefings || [])
      }
    } catch (err) {
      console.error('Failed to fetch briefings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  function handleFilterChange(key: BriefingType | 'ALL') {
    setTypeFilter(key)
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'ALL') {
      params.delete('type')
    } else {
      params.set('type', key)
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  async function handleGenerate(type: BriefingType = 'PRE_EVENT') {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/briefings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing_type: type }),
      })
      if (res.ok) {
        const refreshRes = await fetch(`/api/events/${eventId}/briefings`)
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          const updated = data.briefings || []
          setBriefings(updated)
          // Auto-open the newest briefing
          if (updated.length > 0) {
            const sorted = [...updated].sort((a: BriefingPacket, b: BriefingPacket) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            if (sorted[0].status === 'READY') {
              setViewingId(sorted[0].id)
            }
          }
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to generate briefing')
      }
    } catch {
      setError('Failed to generate briefing')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(briefingId: string) {
    if (!confirm('Delete this briefing?')) return
    setError(null)
    try {
      await fetch(`/api/events/${eventId}/briefings/${briefingId}`, { method: 'DELETE' })
      fetchBriefings()
    } catch {
      setError('Failed to delete briefing')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold font-display text-brand-charcoal tracking-tight">Briefings</h2>
          <p className="text-sm text-ui-secondary mt-1">
            AI-generated personalized briefing packets with guest intel and talking points.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate(typeFilter === 'ALL' ? 'PRE_EVENT' : typeFilter)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-full transition-colors disabled:opacity-50"
          >
            {generating ? null : (
              <>
                <Plus className="w-4 h-4" />
                {typeFilter === 'ALL' ? 'Generate Briefing' :
                  typeFilter === 'PRE_EVENT' ? 'Generate Pre Event Briefing' :
                  typeFilter === 'MORNING' ? 'Generate Morning Briefing' :
                  'Generate End of Day Briefing'}
              </>
            )}
          </button>
          {generating && (
            <AgentThinking steps={THINKING_STEPS.briefing} intervalMs={3000} />
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-medium">×</button>
        </div>
      )}

      {/* Filter by type */}
      <div className="flex gap-1 bg-brand-cream rounded-lg p-1 w-fit">
        {([
          { key: 'ALL' as const, label: 'All' },
          { key: 'PRE_EVENT' as const, label: 'Pre Event' },
          { key: 'MORNING' as const, label: 'Morning' },
          { key: 'END_OF_DAY' as const, label: 'End of Day' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              typeFilter === tab.key
                ? 'bg-white text-brand-charcoal shadow-sm'
                : 'text-ui-tertiary hover:text-brand-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Briefing list */}
      {(() => {
        const filtered = typeFilter === 'ALL' ? briefings : briefings.filter(b => b.briefing_type === typeFilter)
        return filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-12 text-center">
          <Sparkles className="w-10 h-10 text-[#B8755E] mx-auto mb-4" />
          <h3 className="text-lg font-semibold font-display text-brand-charcoal mb-2">Briefings</h3>
          <p className="text-sm text-ui-secondary max-w-md mx-auto mb-4">
            I&apos;ll generate personalized briefings once you have confirmed guests. Each briefing includes talking points, shared interests, and strategic notes tailored to your objectives.
          </p>
          <a
            href={`/dashboard/${eventId}/guest-intelligence`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-terracotta hover:text-brand-terracotta/80 transition-colors"
          >
            View Guest Intelligence
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BriefingCard
              key={b.id}
              briefing={b}
              onView={setViewingId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )
      })()}

      {viewingId && (
        <BriefingViewer
          briefingId={viewingId}
          eventId={eventId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  )
}
