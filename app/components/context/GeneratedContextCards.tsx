'use client'

import { Sparkles, Zap, Building2, Check } from 'lucide-react'
import type { GeneratedContext } from '@/types/context-tab'

interface GeneratedContextCardsProps {
  data: GeneratedContext
}

export function GeneratedContextCards({ data }: GeneratedContextCardsProps) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Partners */}
      <div className="bg-white border border-ui-border rounded-[10px] p-3.5">
        <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-ui-tertiary mb-1.5">
          Partners
        </div>
        {data.sponsors.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-2.5 py-[7px] bg-brand-cream rounded-md ${
              i < data.sponsors.length - 1 ? 'mb-1.5' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-ui-tertiary" />
              <div>
                <div className="text-[13px] font-semibold text-brand-charcoal">{s.name}</div>
                <div className="text-[11px] text-ui-tertiary">{s.role}</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded ${
                s.tier === 'Primary'
                  ? 'bg-brand-terracotta/10 text-brand-terracotta'
                  : s.tier === 'Gold'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s.tier}
            </span>
          </div>
        ))}
      </div>

      {/* Strategic Significance */}
      <div className="bg-brand-terracotta/[0.06] border border-brand-terracotta/20 rounded-[10px] p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles size={14} className="text-brand-terracotta" />
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-brand-terracotta">
            Strategic Significance
          </span>
        </div>
        <p className="text-[13px] text-brand-charcoal leading-relaxed m-0">
          {data.strategicSignificance}
        </p>
      </div>

      {/* Market Context */}
      <div className="bg-amber-50 border border-amber-300/30 rounded-[10px] p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={14} className="text-amber-600" />
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-amber-800">
            Market Context
          </span>
          <span className="inline-flex items-center text-[10px] font-medium bg-amber-100/60 text-amber-700 px-2 py-0.5 rounded">
            AI Researched
          </span>
        </div>
        <p className="text-[13px] text-amber-900 leading-relaxed m-0">{data.marketContext}</p>
      </div>

      {/* Completeness */}
      <CompletenessCard items={data.completeness} />
    </div>
  )
}

function CompletenessCard({ items }: { items: GeneratedContext['completeness'] }) {
  const done = items.filter((i) => i.done).length
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0

  return (
    <div className="bg-white border border-ui-border rounded-[10px] p-3.5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-ui-tertiary">
          Context Completeness
        </span>
        <span
          className={`text-[13px] font-bold ${pct >= 60 ? 'text-brand-forest' : 'text-amber-600'}`}
        >
          {pct}%
        </span>
      </div>
      <div className="h-[5px] bg-[#EEEAE5] rounded-sm overflow-hidden mb-2.5">
        <div
          className="h-full bg-brand-forest rounded-sm transition-[width] duration-600 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span
            key={i}
            className={`text-xs px-2.5 py-[3px] rounded ${
              it.done
                ? 'bg-brand-forest/10 text-brand-forest font-semibold'
                : 'bg-[#F5F2EE] text-[#aaa] font-normal'
            }`}
          >
            {it.done && (
              <Check size={10} className="inline mr-0.5 -mt-px" />
            )}
            {it.label}
          </span>
        ))}
      </div>
    </div>
  )
}
