'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Sparkles } from 'lucide-react'
import { BriefingCard } from '@/app/components/BriefingCard'
import { BriefingViewer } from '@/app/components/BriefingViewer'
import type { BriefingPacket, BriefingType } from '@/types/phase3'

export default function BriefingsPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [briefings, setBriefings] = useState<BriefingPacket[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)

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

  async function handleGenerate(type: BriefingType = 'PRE_EVENT') {
    setGenerating(true)
    try {
      const res = await fetch(`/api/events/${eventId}/briefings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing_type: type }),
      })
      if (res.ok) {
        fetchBriefings()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to generate briefing')
      }
    } catch {
      alert('Failed to generate briefing')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(briefingId: string) {
    if (!confirm('Delete this briefing?')) return
    try {
      await fetch(`/api/events/${eventId}/briefings/${briefingId}`, { method: 'DELETE' })
      fetchBriefings()
    } catch {
      alert('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#6e6e7e] text-sm font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1a1a2e] tracking-tight">Briefings</h2>
          <p className="text-sm text-[#4a4a5e] mt-1">
            AI-generated personalized briefing packets with guest intel and talking points.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate('PRE_EVENT')}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F4F3F] hover:bg-[#1a3a2a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Sparkles className="w-4 h-4 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Generate Briefing
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick generate buttons */}
      <div className="flex gap-2">
        {(['PRE_EVENT', 'MORNING', 'END_OF_DAY'] as BriefingType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleGenerate(type)}
            disabled={generating}
            className="px-3 py-1.5 text-xs font-medium text-[#4a4a5e] bg-white border border-[#e1e4e8] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Briefing list */}
      {briefings.length === 0 ? (
        <div className="bg-white border border-[#e1e4e8] rounded-lg p-12 text-center">
          <Sparkles className="w-10 h-10 text-[#B8755E] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">No Briefings Yet</h3>
          <p className="text-sm text-[#6e6e7e] max-w-md mx-auto">
            Generate your first briefing to get AI-powered guest intel, talking points, and conversation starters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefings.map((b) => (
            <BriefingCard
              key={b.id}
              briefing={b}
              onView={setViewingId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

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
