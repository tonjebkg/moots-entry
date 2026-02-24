'use client'

import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

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
}

export function ScoreCard({
  contactName, company, title, photoUrl, score,
  rationale, matchedObjectives, talkingPoints, scoredAt,
}: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false)

  const scoreColor = score >= 70
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : score >= 40
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-gray-100 text-ui-tertiary border-gray-200'

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

          {scoredAt && (
            <div className="text-xs text-ui-tertiary">
              Scored {new Date(scoredAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
