'use client'

import { useState, type RefObject } from 'react'
import { Sparkles, Send, Upload, Zap, MessageCircle } from 'lucide-react'
import { ActivityItemRow } from './ActivityItem'
import type { ActivityItem } from '@/types/context-tab'

interface RightPanelProps {
  activities: ActivityItem[]
  feedRef: RefObject<HTMLDivElement>
  bottomRef: RefObject<HTMLDivElement>
  userScrolled: boolean
  onScroll: () => void
  onScrollToBottom: () => void
  onSend: (message: string) => void
  isProcessing: boolean
  hasGeneratedContext?: boolean
}

const PRE_GENERATION_PROMPTS = [
  'What documents should I upload for a dinner event?',
  'Help me define the event\'s strategic purpose',
  'What context is the AI missing?',
]

const POST_GENERATION_PROMPTS = [
  'Who are my top 5 guests?',
  'Find keynote speakers from past events',
  'What competing events are happening that week?',
]

export function RightPanel({
  activities,
  feedRef,
  bottomRef,
  userScrolled,
  onScroll,
  onScrollToBottom,
  onSend,
  isProcessing,
  hasGeneratedContext = false,
}: RightPanelProps) {
  const [inputMsg, setInputMsg] = useState('')

  const handleSend = () => {
    if (!inputMsg.trim()) return
    onSend(inputMsg.trim())
    setInputMsg('')
  }

  const statusText = isProcessing
    ? 'Processing...'
    : activities.length > 1
      ? 'Active · Watching for context'
      : 'Ready'

  const statusColor = isProcessing
    ? 'text-brand-terracotta'
    : activities.length > 1
      ? 'text-brand-forest'
      : 'text-ui-tertiary'

  // Determine if this is the initial empty state (only the welcome message)
  const isInitialState = activities.length <= 1 && activities[0]?.type === 'waiting'

  // Contextual suggestion prompts
  const suggestedPrompts = hasGeneratedContext ? POST_GENERATION_PROMPTS : PRE_GENERATION_PROMPTS

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8]">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-ui-border bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-full bg-brand-terracotta/10 flex items-center justify-center">
            <Sparkles size={14} className="text-brand-terracotta" />
          </div>
          <div>
            <div className="text-sm font-bold text-brand-charcoal">Moots Intelligence</div>
            <div className={`text-[11px] font-medium ${statusColor} ${isProcessing ? 'animate-pulse' : ''}`}>
              {statusText}
            </div>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={feedRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto px-5 pt-4 pb-2"
        >
          {activities.map((item, i) => (
            <ActivityItemRow
              key={item.id || i}
              item={item}
              isLatest={i === activities.length - 1}
            />
          ))}

          {/* Empty state onboarding hints */}
          {isInitialState && (
            <div className="mt-4 space-y-3 opacity-50">
              <OnboardingStep
                step={1}
                icon={<Upload size={14} />}
                title="Upload documents"
                desc="AI reads & extracts key information"
              />
              <OnboardingStep
                step={2}
                icon={<Zap size={14} />}
                title="Generate context"
                desc="AI researches market, finds insights"
              />
              <OnboardingStep
                step={3}
                icon={<MessageCircle size={14} />}
                title="Ask questions"
                desc="AI helps with speakers, sponsors, strategy"
              />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom button */}
        {userScrolled && (
          <button
            onClick={onScrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-brand-terracotta text-white border-none rounded-full py-1.5 px-4 text-xs font-semibold cursor-pointer shadow-lg flex items-center gap-1.5 font-sans"
          >
            ↓ Latest activity
          </button>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="px-5 pt-2 flex gap-1.5 flex-wrap">
        {suggestedPrompts.map((p) => (
          <button
            key={p}
            onClick={() => onSend(p)}
            className="text-[12px] px-2.5 py-1 rounded-full bg-brand-cream text-brand-charcoal/70 border border-ui-border hover:border-brand-terracotta/30 hover:text-brand-terracotta transition-colors font-sans cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="px-5 py-2.5 pb-4 border-t border-ui-border bg-white mt-2">
        <div className="flex items-center gap-2 py-[5px] pl-3.5 pr-[5px] border-[1.5px] border-ui-border rounded-xl bg-brand-cream transition-colors focus-within:border-brand-terracotta/50">
          <input
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Moots to research, look up sponsors, find competing events..."
            className="flex-1 text-[13px] border-none bg-transparent outline-none font-sans text-brand-charcoal placeholder:text-ui-tertiary"
          />
          <button
            onClick={handleSend}
            disabled={!inputMsg.trim()}
            className={`w-9 h-9 rounded-[9px] border-none flex items-center justify-center shrink-0 ${
              inputMsg.trim()
                ? 'bg-brand-terracotta text-white cursor-pointer'
                : 'bg-[#E0DBD4] text-white cursor-default'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Onboarding step (ghost hint) ─── */

function OnboardingStep({
  step,
  icon,
  title,
  desc,
}: {
  step: number
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center w-7 shrink-0">
        <div className="w-7 h-7 rounded-full border-2 border-dashed border-ui-border flex items-center justify-center text-ui-tertiary">
          {icon}
        </div>
        {step < 3 && <div className="w-0.5 h-4 border-l-2 border-dashed border-ui-border mt-1" />}
      </div>
      <div className="pt-0.5">
        <div className="text-[13px] font-semibold text-brand-charcoal/50">{title}</div>
        <div className="text-[12px] text-ui-tertiary">{desc}</div>
      </div>
    </div>
  )
}
