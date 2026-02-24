'use client'

import { useEffect, useState } from 'react'
import { X, Target, MessageSquare, Lightbulb, Sparkles } from 'lucide-react'
import type { BriefingPacket, BriefingContent, BriefingGuest } from '@/types/phase3'

interface BriefingViewerProps {
  briefingId: string
  eventId: string
  onClose: () => void
}

export function BriefingViewer({ briefingId, eventId, onClose }: BriefingViewerProps) {
  const [briefing, setBriefing] = useState<BriefingPacket | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await window.fetch(`/api/events/${eventId}/briefings/${briefingId}`)
        if (res.ok) setBriefing(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [briefingId, eventId])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-[700px] bg-white flex items-center justify-center">
          <p className="text-sm text-[#6e6e7e]">Loading briefing...</p>
        </div>
      </div>
    )
  }

  if (!briefing || briefing.status !== 'READY') {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-[700px] bg-white flex items-center justify-center">
          <p className="text-sm text-[#6e6e7e]">Briefing not available</p>
        </div>
      </div>
    )
  }

  const content = briefing.content as BriefingContent

  function getScoreColor(score: number) {
    if (score >= 80) return 'bg-green-50 text-green-700 border-green-200'
    if (score >= 60) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[700px] bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e1e4e8] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a2e]">{briefing.title}</h3>
            <p className="text-xs text-[#6e6e7e] mt-0.5">
              For {briefing.generated_for_name} · {briefing.guest_count} guests · {new Date(briefing.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-[#6e6e7e]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Event Summary */}
          {content.event_summary && (
            <div className="bg-[#FAF9F7] border border-[#e1e4e8] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#B8755E]" />
                <h4 className="text-sm font-semibold text-[#1a1a2e]">Event Summary</h4>
              </div>
              <p className="text-sm text-[#4a4a5e] leading-relaxed">{content.event_summary}</p>
            </div>
          )}

          {/* Agenda Highlights */}
          {content.agenda_highlights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#1a1a2e] mb-2">Agenda Highlights</h4>
              <ul className="space-y-1.5">
                {content.agenda_highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#4a4a5e]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F4F3F] mt-1.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strategic Notes */}
          {content.strategic_notes && (
            <div className="bg-white border border-[#e1e4e8] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[#2F4F3F]" />
                <h4 className="text-sm font-semibold text-[#1a1a2e]">Strategic Notes</h4>
              </div>
              <p className="text-sm text-[#4a4a5e] leading-relaxed">{content.strategic_notes}</p>
            </div>
          )}

          {/* Key Guests */}
          <div>
            <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Key Guests</h4>
            <div className="space-y-4">
              {content.key_guests.map((guest: BriefingGuest, i) => (
                <div key={i} className="bg-white border border-[#e1e4e8] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-[#1a1a2e]">{guest.full_name}</h5>
                      {(guest.title || guest.company) && (
                        <p className="text-xs text-[#6e6e7e]">
                          {guest.title}{guest.title && guest.company ? ' at ' : ''}{guest.company}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded border ${getScoreColor(guest.relevance_score)}`}>
                      {guest.relevance_score}
                    </span>
                  </div>

                  {guest.score_rationale && (
                    <p className="text-xs text-[#4a4a5e] mb-3">{guest.score_rationale}</p>
                  )}

                  {guest.talking_points.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageSquare className="w-3 h-3 text-[#B8755E]" />
                        <span className="text-xs font-medium text-[#6e6e7e]">Talking Points</span>
                      </div>
                      <ul className="space-y-1">
                        {guest.talking_points.map((p, j) => (
                          <li key={j} className="text-xs text-[#4a4a5e] pl-4">• {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {guest.conversation_starters.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Lightbulb className="w-3 h-3 text-[#2F4F3F]" />
                        <span className="text-xs font-medium text-[#6e6e7e]">Conversation Starters</span>
                      </div>
                      <ul className="space-y-1">
                        {guest.conversation_starters.map((s, j) => (
                          <li key={j} className="text-xs text-[#4a4a5e] pl-4 italic">&ldquo;{s}&rdquo;</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
