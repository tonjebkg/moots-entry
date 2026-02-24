'use client'

import { BarChart3, Users, TrendingUp, TrendingDown } from 'lucide-react'

interface ScoringStats {
  total_contacts: number
  scored_count: number
  avg_score: number | null
  max_score: number | null
  min_score: number | null
}

interface ScoringDashboardProps {
  stats: ScoringStats
}

export function ScoringDashboard({ stats }: ScoringDashboardProps) {
  const scoredPct = stats.total_contacts > 0
    ? Math.round((stats.scored_count / stats.total_contacts) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users size={16} className="text-brand-terracotta" />
          <span className="text-xs font-semibold text-ui-tertiary uppercase">Scored</span>
        </div>
        <div className="text-2xl font-bold text-brand-charcoal">
          {stats.scored_count}
          <span className="text-sm font-normal text-ui-tertiary">/{stats.total_contacts}</span>
        </div>
        <div className="text-xs text-ui-tertiary mt-1">{scoredPct}% coverage</div>
      </div>

      <div className="bg-white rounded-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={16} className="text-brand-terracotta" />
          <span className="text-xs font-semibold text-ui-tertiary uppercase">Avg Score</span>
        </div>
        <div className={`text-2xl font-bold ${
          (stats.avg_score || 0) >= 70 ? 'text-emerald-700' :
          (stats.avg_score || 0) >= 40 ? 'text-amber-700' :
          'text-ui-tertiary'
        }`}>
          {stats.avg_score ?? '—'}
        </div>
        <div className="text-xs text-ui-tertiary mt-1">out of 100</div>
      </div>

      <div className="bg-white rounded-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-emerald-600" />
          <span className="text-xs font-semibold text-ui-tertiary uppercase">Highest</span>
        </div>
        <div className="text-2xl font-bold text-emerald-700">
          {stats.max_score ?? '—'}
        </div>
      </div>

      <div className="bg-white rounded-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown size={16} className="text-ui-tertiary" />
          <span className="text-xs font-semibold text-ui-tertiary uppercase">Lowest</span>
        </div>
        <div className="text-2xl font-bold text-ui-tertiary">
          {stats.min_score ?? '—'}
        </div>
      </div>
    </div>
  )
}
