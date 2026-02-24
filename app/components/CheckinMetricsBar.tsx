'use client'

import { Users, UserCheck, UserPlus, TrendingUp } from 'lucide-react'
import type { CheckinMetrics } from '@/types/phase3'

interface CheckinMetricsBarProps {
  metrics: CheckinMetrics
}

export function CheckinMetricsBar({ metrics }: CheckinMetricsBarProps) {
  const cards = [
    {
      label: 'Expected',
      value: metrics.total_expected,
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Checked In',
      value: metrics.total_checked_in,
      icon: UserCheck,
      color: 'bg-green-50 text-green-700 border-green-200',
      iconColor: 'text-green-500',
    },
    {
      label: 'Walk-ins',
      value: metrics.walk_ins,
      icon: UserPlus,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Check-in Rate',
      value: `${metrics.check_in_rate}%`,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      iconColor: 'text-purple-500',
    },
  ]

  // Capacity gauge
  const gaugePercent = Math.min(100, metrics.check_in_rate)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`border rounded-lg p-4 ${card.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">{card.label}</span>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Capacity gauge */}
      <div className="bg-white border border-ui-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ui-secondary">Capacity</span>
          <span className="text-sm font-semibold text-brand-charcoal">
            {metrics.total_checked_in} / {metrics.total_expected || '—'}
          </span>
        </div>
        <div className="h-3 bg-brand-cream rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-forest rounded-full transition-all duration-500"
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
