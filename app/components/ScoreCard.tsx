'use client'

import { ChevronDown, ChevronUp, MessageSquare, Plus } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { formatUSDateTime } from '@/lib/datetime'

interface MatchedObjective {
  objective_id: string
  objective_text: string
  match_score: number
  explanation: string
}

interface ScoreCardProps {
  contactName: string
  company: string | null
  title: string | null
  photoUrl: string | null
  score: number
  rationale: string | null
  matchedObjectives: MatchedObjective[] | null
  talkingPoints: string[] | null
  scoredAt: string | null
  source?: string | null
  eventStatus?: string | null
  onAddToWave?: () => void
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  RSVP_SUBMISSION: { label: 'RSVP', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  JOIN_REQUEST: { label: 'Join Request', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  CSV_IMPORT: { label: 'Import', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  EVENT_IMPORT: { label: 'Import', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  MANUAL: { label: 'Manual', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  ENRICHMENT: { label: 'Enriched', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  API: { label: 'API', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONSIDERING: { label: 'Selected', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  INVITED: { label: 'Invited', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DECLINED: { label: 'Declined', color: 'bg-red-50 text-red-700 border-red-200' },
  WAITLIST: { label: 'Waitlist', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  BOUNCED: { label: 'Bounced', color: 'bg-red-50 text-red-700 border-red-200' },
}

export function ScoreCard({
  contactName, company, title, photoUrl, score,
  rationale, matchedObjectives, talkingPoints, scoredAt,
  source, eventStatus, onAddToWave,
}: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false)

  const scoreColor = score >= 70
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : score >= 40
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-gray-100 text-ui-tertiary border-gray-200'

  const srcInfo = source ? SOURCE_LABELS[source] : null
  const statusInfo = eventStatus ? STATUS_LABELS[eventStatus] : null

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-brand-cream transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score Circle */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${scoreColor}`}>
          {score}
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {photoUrl ? (
            <Image src={photoUrl} alt={contactName} width={32} height={32} className="w-8 h-8 rounded-full object-cover" unoptimized />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-terracotta to-brand-forest flex items-center justify-center text-white text-xs font-bold shrink-0">
              {contactName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-brand-charcoal truncate">{contactName}</div>
            {(title || company) && (
              <div className="text-xs text-ui-tertiary truncate">
                {title}{title && company ? ' @ ' : ''}{company}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {srcInfo && (
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${srcInfo.color}`}>
              {srcInfo.label}
            </span>
          )}
          {statusInfo && (
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          )}
        </div>

        {/* Talking points indicator */}
        {talkingPoints && talkingPoints.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-ui-tertiary">
            <MessageSquare size={12} />
            {talkingPoints.length}
          </div>
        )}

        {/* Expand toggle */}
        {expanded ? <ChevronUp size={16} className="text-ui-tertiary" /> : <ChevronDown size={16} className="text-ui-tertiary" />}
      </div>

      {expanded && (
        <div className="border-t border-ui-border bg-brand-cream p-4 space-y-4">
          {/* Rationale */}
          {rationale && (
            <div>
              <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-1.5">Why They Match</h4>
              <p className="text-sm text-ui-secondary leading-relaxed">{rationale}</p>
            </div>
          )}

          {/* Objective Scores */}
          {matchedObjectives && matchedObjectives.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Objective Breakdown</h4>
              <div className="space-y-2">
                {matchedObjectives.map((mo, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                      mo.match_score >= 70 ? 'bg-emerald-50 text-emerald-700'
                        : mo.match_score >= 40 ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-50 text-ui-tertiary'
                    }`}>
                      {mo.match_score}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-brand-charcoal truncate">{mo.objective_text}</div>
                      {mo.explanation && <div className="text-xs text-ui-tertiary mt-0.5">{mo.explanation}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talking Points */}
          {talkingPoints && talkingPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider mb-2">Talking Points</h4>
              <ul className="space-y-1">
                {talkingPoints.map((tp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ui-secondary">
                    <span className="text-brand-terracotta mt-1">•</span>
                    <span>{tp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            {scoredAt && (
              <div className="text-xs text-ui-tertiary">
                Scored {formatUSDateTime(new Date(scoredAt))}
              </div>
            )}
            {onAddToWave && !eventStatus && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToWave() }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-md transition-colors"
              >
                <Plus size={12} />
                Add to Wave
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
