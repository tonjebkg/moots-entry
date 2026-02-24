'use client'

import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
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
      : 'bg-gray-100 text-[#6e6e7e] border-gray-200'

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score Circle */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${scoreColor}`}>
          {score}
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {photoUrl ? (
            <img src={photoUrl} alt={contactName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0f3460] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {contactName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-[#1a1a2e] truncate">{contactName}</div>
            {(title || company) && (
              <div className="text-xs text-[#6e6e7e] truncate">
                {title}{title && company ? ' @ ' : ''}{company}
              </div>
            )}
          </div>
        </div>

        {/* Talking points indicator */}
        {talkingPoints && talkingPoints.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#6e6e7e]">
            <MessageSquare size={12} />
            {talkingPoints.length}
          </div>
        )}

        {/* Expand toggle */}
        {expanded ? <ChevronUp size={16} className="text-[#6e6e7e]" /> : <ChevronDown size={16} className="text-[#6e6e7e]" />}
      </div>

      {expanded && (
        <div className="border-t border-[#e1e4e8] p-4 space-y-4">
          {/* Rationale */}
          {rationale && (
            <div>
              <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider mb-1.5">Why They Match</h4>
              <p className="text-sm text-[#4a4a5e] leading-relaxed">{rationale}</p>
            </div>
          )}

          {/* Objective Scores */}
          {matchedObjectives && matchedObjectives.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider mb-2">Objective Breakdown</h4>
              <div className="space-y-2">
                {matchedObjectives.map((mo, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                      mo.match_score >= 70 ? 'bg-emerald-50 text-emerald-700'
                        : mo.match_score >= 40 ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-50 text-[#6e6e7e]'
                    }`}>
                      {mo.match_score}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1a1a2e] truncate">{mo.objective_text}</div>
                      {mo.explanation && <div className="text-xs text-[#6e6e7e] mt-0.5">{mo.explanation}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talking Points */}
          {talkingPoints && talkingPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider mb-2">Talking Points</h4>
              <ul className="space-y-1">
                {talkingPoints.map((tp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#4a4a5e]">
                    <span className="text-[#0f3460] mt-1">•</span>
                    <span>{tp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scoredAt && (
            <div className="text-xs text-[#6e6e7e]">
              Scored {new Date(scoredAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
