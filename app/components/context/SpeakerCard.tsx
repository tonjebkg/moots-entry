'use client'

import { useState } from 'react'
import type { SpeakerCandidate } from '@/types/context-tab'

interface SpeakerCardProps {
  speaker: SpeakerCandidate
  rank: number
}

export function SpeakerCard({ speaker, rank }: SpeakerCardProps) {
  const [expanded, setExpanded] = useState(false)

  const relevanceColor =
    speaker.relevance >= 95
      ? 'text-brand-forest'
      : speaker.relevance >= 90
        ? 'text-emerald-700'
        : speaker.relevance >= 85
          ? 'text-amber-600'
          : 'text-ui-tertiary'

  const avatarBg =
    rank === 1
      ? 'bg-brand-terracotta'
      : rank === 2
        ? 'bg-brand-forest'
        : rank === 3
          ? 'bg-[#6B5CE7]'
          : 'bg-ui-tertiary'

  const initials = speaker.name
    .split(' ')
    .map((n) => n[0])
    .join('')

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`bg-white border rounded-[10px] p-3.5 cursor-pointer transition-all ${
        rank === 1
          ? 'border-brand-terracotta/35 shadow-[0_0_0_1px_rgba(184,117,94,0.13)]'
          : 'border-ui-border'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className={`w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold ${avatarBg}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-brand-charcoal flex items-center gap-1.5">
              {speaker.name}
              {rank === 1 && (
                <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded bg-brand-terracotta/10 text-brand-terracotta">
                  Top Pick
                </span>
              )}
            </div>
            <div className="text-[13px] text-ui-tertiary truncate">{speaker.title}</div>
          </div>
        </div>
        <div className="text-center shrink-0">
          <div className={`text-xl font-extrabold leading-none ${relevanceColor}`}>
            {speaker.relevance}
          </div>
          <div className="text-[11px] text-ui-tertiary font-semibold uppercase tracking-[0.05em]">
            Match
          </div>
        </div>
      </div>

      {/* Quick info tags */}
      <div className="flex gap-1.5 mt-2.5 flex-wrap">
        <span className="text-[13px] px-2 py-0.5 rounded bg-brand-forest/10 text-brand-forest font-medium">
          {speaker.pastEvents.split(',')[0]}
        </span>
        <span className="text-[13px] px-2 py-0.5 rounded bg-[#EDE8FF] text-[#6B5CE7] font-medium">
          {speaker.speakingExperience.split(',')[0]}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-2.5 border-t border-ui-border flex flex-col gap-2">
          <DetailBlock label="Past Events" text={speaker.pastEvents} />
          <DetailBlock label="Speaking Experience" text={speaker.speakingExperience} />
          <DetailBlock label="Why They Fit" text={speaker.fitAnalysis} />
          <DetailBlock label="Relationship" text={speaker.relationshipStatus} />
          <div className="flex gap-1.5 mt-1">
            <button className="text-[13px] font-semibold py-[5px] px-3 rounded-md bg-brand-terracotta text-white border-none cursor-pointer">
              Draft outreach
            </button>
            <button className="text-[13px] font-semibold py-[5px] px-3 rounded-md bg-transparent text-brand-terracotta border border-brand-terracotta/25 cursor-pointer">
              Add to guest list
            </button>
            <button className="text-[13px] font-semibold py-[5px] px-3 rounded-md bg-transparent text-ui-tertiary border border-ui-border cursor-pointer">
              View full profile
            </button>
          </div>
        </div>
      )}

      {/* Expand hint */}
      {!expanded && (
        <div className="text-[13px] text-ui-tertiary mt-1.5 italic">
          Click to see full profile and outreach options
        </div>
      )}
    </div>
  )
}

function DetailBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[12px] font-bold text-ui-tertiary uppercase tracking-[0.05em] mb-0.5">
        {label}
      </div>
      <div className="text-sm text-brand-charcoal leading-relaxed">{text}</div>
    </div>
  )
}
