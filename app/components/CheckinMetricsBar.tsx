'use client'

import { Users, UserCheck, UserPlus, UserX } from 'lucide-react'
import type { CheckinMetrics } from '@/types/phase3'

interface CheckinMetricsBarProps {
  metrics: CheckinMetrics
  onFilter?: (filter: string) => void
  activeFilter?: string
}

export function CheckinMetricsBar({ metrics, onFilter, activeFilter }: CheckinMetricsBarProps) {
  const cards = [
    {
      label: 'Expected',
      value: metrics.total_expected,
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-500',
      filterKey: 'expected',
    },
    {
      label: 'Present',
      value: metrics.total_checked_in,
      icon: UserCheck,
      color: 'bg-green-50 text-green-700 border-green-200',
      iconColor: 'text-green-500',
      filterKey: 'checked_in',
    },
    {
      label: 'Walk-ins',
      value: metrics.walk_ins,
      icon: UserPlus,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      iconColor: 'text-amber-500',
      filterKey: 'walk_ins',
    },
    {
      label: 'Not Arrived',
      value: metrics.not_arrived ?? 0,
      icon: UserX,
      color: 'bg-red-50 text-red-600 border-red-200',
      iconColor: 'text-red-400',
      filterKey: 'not_arrived',
    },
  ]

  // Capacity gauge: checked_in / expected
  const gaugePercent = metrics.total_expected > 0
    ? Math.round((metrics.total_checked_in / metrics.total_expected) * 100)
    : 0
  const isOverCapacity = gaugePercent > 100
  const gaugeWidth = Math.min(100, gaugePercent)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => card.filterKey && onFilter?.(activeFilter === card.filterKey ? '' : card.filterKey)}
            className={`border rounded-lg p-3 text-left transition-all ${card.color} ${
              card.filterKey && onFilter ? 'cursor-pointer hover:shadow-md' : ''
            } ${activeFilter === card.filterKey ? 'ring-2 ring-offset-1 ring-brand-terracotta' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">{card.label}</span>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </button>
        ))}
      </div>

      {/* Capacity gauge */}
      <div className="bg-white border border-ui-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ui-secondary">Capacity</span>
          <span className={`text-sm font-semibold ${isOverCapacity ? 'text-red-600' : 'text-brand-charcoal'}`}>
            {metrics.total_checked_in} / {metrics.total_expected || '—'}
            {gaugePercent > 0 && ` (${gaugePercent}%)`}
          </span>
        </div>
        <div className="h-3 bg-brand-cream rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isOverCapacity ? 'bg-red-500' : 'bg-brand-forest'}`}
            style={{ width: `${gaugeWidth}%` }}
          />
        </div>
      </div>
    </div>
  )
}
