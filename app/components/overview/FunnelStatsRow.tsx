'use client'

import { Users, Target, Send, CheckCircle, ChevronRight } from 'lucide-react'
import { StatCard } from '@/app/components/ui/StatCard'

interface FunnelData {
  evaluated: number
  qualified: number
  invited: number
  confirmed: number
}

interface FunnelStatsRowProps {
  funnel: FunnelData
}

export function FunnelStatsRow({ funnel }: FunnelStatsRowProps) {
  const steps = [
    { label: 'Pool Evaluated', value: funnel.evaluated, icon: Users, iconColor: 'text-brand-charcoal', iconBg: 'bg-brand-cream' },
    { label: 'Qualified', value: funnel.qualified, icon: Target, iconColor: 'text-brand-terracotta', iconBg: 'bg-brand-terracotta/10' },
    { label: 'Invited', value: funnel.invited, icon: Send, iconColor: 'text-blue-700', iconBg: 'bg-blue-50' },
    { label: 'Confirmed', value: funnel.confirmed, icon: CheckCircle, iconColor: 'text-emerald-700', iconBg: 'bg-emerald-50' },
  ]

  return (
    <div className="flex items-stretch gap-2">
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-stretch flex-1">
          <div className="flex-1">
            <StatCard
              label={step.label}
              value={step.value}
              icon={step.icon}
              iconColor={step.iconColor}
              iconBg={step.iconBg}
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
  )
}
