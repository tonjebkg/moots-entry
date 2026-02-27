import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  href?: string
  onClick?: () => void
}

export function StatCard({ label, value, subtitle, icon: Icon, iconColor = 'text-brand-terracotta', iconBg = 'bg-brand-terracotta/10', href, onClick }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-3 mb-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon size={16} className={iconColor} />
          </div>
        )}
        <span className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display text-2xl font-bold text-brand-charcoal">{value}</div>
      {subtitle && (
        <div className="text-[13px] text-ui-tertiary mt-1">{subtitle}</div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="block bg-white rounded-card shadow-card p-5 hover:shadow-md hover:border-brand-terracotta/20 border border-transparent transition-all cursor-pointer">
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left bg-white rounded-card shadow-card p-5 hover:shadow-md hover:border-brand-terracotta/20 border border-transparent transition-all cursor-pointer">
        {content}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-card shadow-card p-5">
      {content}
    </div>
  )
}
