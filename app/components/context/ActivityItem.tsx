'use client'

import { Eye, Check, Search, Zap, Lightbulb, Sparkles, Users, Loader2 } from 'lucide-react'
import type { ActivityItem as ActivityItemType } from '@/types/context-tab'
import { SpeakerCard } from './SpeakerCard'

function formatRelativeTime(timestamp: string): string {
  try {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diffMs = now - then
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)

    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

interface ActivityItemProps {
  item: ActivityItemType
  isLatest: boolean
}

const ICON_MAP = {
  reading: { icon: Eye, color: 'text-brand-terracotta', label: 'Reading', dotBg: 'bg-[#F5F3F0]' },
  extracted: { icon: Check, color: 'text-brand-forest', label: 'Extracted', dotBg: 'bg-[#F5F3F0]' },
  researching: { icon: Search, color: 'text-[#6B5CE7]', label: 'Researching', dotBg: 'bg-[#F5F3F0]' },
  found: { icon: Zap, color: 'text-amber-600', label: 'Found', dotBg: 'bg-[#F5F3F0]' },
  insight: { icon: Lightbulb, color: 'text-brand-terracotta', label: 'Insight', dotBg: 'bg-[#F5F3F0]' },
  suggestion: { icon: Sparkles, color: 'text-brand-terracotta', label: 'Suggestion', dotBg: 'bg-brand-terracotta/10' },
  complete: { icon: Check, color: 'text-brand-forest', label: 'Done', dotBg: 'bg-brand-forest/10' },
  waiting: { icon: Sparkles, color: 'text-ui-tertiary', label: '', dotBg: 'bg-transparent' },
  user: { icon: Users, color: 'text-brand-charcoal', label: 'You', dotBg: 'border border-ui-border bg-transparent' },
  speaker_card: { icon: Users, color: 'text-[#6B5CE7]', label: 'Speaker Candidates', dotBg: 'bg-[#EDE8FF]' },
} as const

export function ActivityItemRow({ item, isLatest }: ActivityItemProps) {
  const meta = ICON_MAP[item.type] || ICON_MAP.insight
  const Icon = meta.icon
  const isActive = item.type === 'reading' || item.type === 'researching'

  return (
    <div
      className={`flex gap-3 py-3 transition-opacity duration-300 ${
        isLatest ? 'opacity-100' : 'opacity-85'
      }`}
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center w-7 shrink-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center ${meta.dotBg} ${meta.color} ${
            isActive && isLatest ? 'animate-pulse' : ''
          }`}
        >
          {isActive && isLatest ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Icon size={15} />
          )}
        </div>
        <div className="w-0.5 flex-1 bg-ui-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        {/* User message bubble */}
        {item.type === 'user' ? (
          <div className="bg-brand-charcoal text-white py-2.5 px-3.5 rounded-xl rounded-bl-[4px] text-sm leading-relaxed max-w-[95%]">
            {item.text}
          </div>
        ) : (
          <>
            {meta.label && (
              <div className={`text-[13px] font-bold tracking-[0.04em] uppercase mb-[3px] ${meta.color}`}>
                {meta.label}
              </div>
            )}
            <div className="text-sm text-brand-charcoal leading-relaxed">{item.text}</div>
          </>
        )}

        {/* Speaker cards */}
        {item.speakers && item.speakers.length > 0 && (
          <div className="flex flex-col gap-2.5 mt-2.5">
            {item.speakers.map((sp, si) => (
              <SpeakerCard key={sp.id || si} speaker={sp} rank={si + 1} />
            ))}
          </div>
        )}

        {/* Details bullet list */}
        {item.details && item.details.length > 0 && (
          <div className="mt-2 p-2.5 px-3 bg-brand-cream rounded-lg border border-ui-border text-sm text-brand-charcoal leading-relaxed">
            {item.details.map((d, i) => (
              <div key={i} className={`flex gap-1.5 items-start ${i < item.details!.length - 1 ? 'mb-1.5' : ''}`}>
                <span className="text-brand-terracotta shrink-0 mt-0.5">•</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {item.actions && item.actions.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {item.actions.map((a) => (
              <button
                key={a.id}
                className={`text-[13px] font-semibold py-1.5 px-3.5 rounded-md cursor-pointer font-sans ${
                  a.primary
                    ? 'bg-brand-terracotta text-white border-none'
                    : 'bg-transparent text-brand-terracotta border border-brand-terracotta/25'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {item.timestamp && (
          <div className="text-[13px] text-[#aaa] mt-1">{formatRelativeTime(item.timestamp)}</div>
        )}
      </div>
    </div>
  )
}
