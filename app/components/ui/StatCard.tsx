import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
}

export function StatCard({ label, value, icon: Icon, iconColor = 'text-brand-terracotta', iconBg = 'bg-brand-terracotta/10' }: StatCardProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-5">
      <div className="flex items-center gap-3 mb-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon size={16} className={iconColor} />
          </div>
        )}
        <span className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display text-2xl font-bold text-brand-charcoal">{value}</div>
    </div>
  )
}
