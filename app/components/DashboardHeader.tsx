'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'

interface DashboardHeaderProps {
  activeNav?: 'events' | 'people'
  rightSlot?: React.ReactNode
}

export function DashboardHeader({ activeNav, rightSlot }: DashboardHeaderProps) {
  const pathname = usePathname()

  // Auto-detect active nav from pathname if not explicitly set
  const active = activeNav ?? (pathname?.startsWith('/dashboard/people') ? 'people' : 'events')

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/98 backdrop-blur-sm border-b border-ui-border z-50">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-display text-2xl font-bold text-brand-charcoal hover:text-brand-terracotta transition-colors">
            Moots
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-sm font-semibold pb-0.5 border-b-2 transition-colors ${
                active === 'events'
                  ? 'text-brand-terracotta border-brand-terracotta'
                  : 'text-ui-tertiary border-transparent hover:text-brand-charcoal'
              }`}
            >
              Events
            </Link>
            <Link
              href="/dashboard/people"
              className={`text-sm font-semibold pb-0.5 border-b-2 transition-colors ${
                active === 'people'
                  ? 'text-brand-terracotta border-brand-terracotta'
                  : 'text-ui-tertiary border-transparent hover:text-brand-charcoal'
              }`}
            >
              People
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings"
            className="p-2 text-ui-tertiary hover:text-brand-terracotta transition-colors rounded-lg hover:bg-brand-cream"
            title="Settings"
          >
            <Settings size={18} />
          </Link>
          {rightSlot}
        </div>
      </div>
    </header>
  )
}
