'use client'

import { Users, Target, CheckCircle, Send, UserCheck, ChevronRight } from 'lucide-react'
import { StatCard } from '@/app/components/ui/StatCard'

interface FunnelData {
  pool: number
  scored: number
  qualified: number
  selected: number
  confirmed: number
}

interface FunnelStatsRowProps {
  funnel: FunnelData
  totalCapacity?: number
  eventId?: string
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return ''
  return `${Math.round((numerator / denominator) * 100)}% of ${denominator}`
}

export function FunnelStatsRow({ funnel, totalCapacity, eventId }: FunnelStatsRowProps) {
  const giBase = eventId ? `/dashboard/${eventId}/guest-intelligence` : undefined

  const steps = [
    {
      label: 'Guest Pool',
      value: funnel.pool,
      subtitle: funnel.scored > 0 ? `${funnel.scored} scored` : 'contacts in pool',
      icon: Users,
      iconColor: 'text-brand-charcoal',
      iconBg: 'bg-brand-cream',
      href: giBase,
    },
    {
      label: 'Scored',
      value: funnel.scored,
      subtitle: pct(funnel.scored, funnel.pool),
      icon: Target,
      iconColor: 'text-brand-terracotta',
      iconBg: 'bg-brand-terracotta/10',
      href: giBase ? `${giBase}?filter=scored` : undefined,
    },
    {
      label: 'Qualified (60+)',
      value: funnel.qualified,
      subtitle: pct(funnel.qualified, funnel.scored),
      icon: CheckCircle,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
      href: giBase ? `${giBase}?filter=qualified` : undefined,
    },
    {
      label: 'Selected',
      value: funnel.selected,
      subtitle: pct(funnel.selected, funnel.qualified),
      icon: Send,
      iconColor: 'text-blue-700',
      iconBg: 'bg-blue-50',
      href: giBase ? `${giBase}?filter=selected` : undefined,
    },
    {
      label: 'Confirmed',
      value: funnel.confirmed,
      subtitle: pct(funnel.confirmed, funnel.selected),
      icon: UserCheck,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
      href: giBase ? `${giBase}?filter=confirmed` : undefined,
    },
  ]

  const isOverCapacity = totalCapacity && totalCapacity > 0 && funnel.confirmed > totalCapacity
  const capacityPct = totalCapacity && totalCapacity > 0
    ? Math.min(Math.round((funnel.confirmed / totalCapacity) * 100), 100)
    : 0

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-stretch flex-1">
            <div className="flex-1">
              <StatCard
                label={step.label}
                value={step.value}
                subtitle={step.subtitle}
                icon={step.icon}
                iconColor={step.iconColor}
                iconBg={step.iconBg}
                href={step.href}
              />
            </div>
            {idx < steps.length - 1 && (
              <div className="flex items-center px-1 text-ui-tertiary">
                <ChevronRight size={16} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      {totalCapacity != null && totalCapacity > 0 && (
        <div className="bg-white rounded-card shadow-card px-5 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">
              Event Capacity
            </span>
            <span className={`text-xs font-semibold ${isOverCapacity ? 'text-red-600' : 'text-brand-charcoal'}`}>
              {funnel.confirmed} / {totalCapacity} seats
              {isOverCapacity && ` (${funnel.confirmed - totalCapacity} over)`}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOverCapacity ? 'bg-red-500' : capacityPct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(capacityPct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
