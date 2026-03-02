'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface EventTabNavigationProps {
  eventId: string
}

type PhaseLabel = 'PRE-EVENT' | 'EVENT DAY' | 'POST-EVENT'

type TabDef = {
  key: string
  label: string
  href: string
  phase: PhaseLabel | null
}

export function EventTabNavigation({ eventId }: EventTabNavigationProps) {
  const pathname = usePathname()

  const tabs: TabDef[] = [
    { key: 'overview', label: 'Overview', href: `/dashboard/${eventId}/overview`, phase: null },
    { key: 'context', label: 'Context', href: `/dashboard/${eventId}/context`, phase: 'PRE-EVENT' },
    { key: 'objectives', label: 'Targeting', href: `/dashboard/${eventId}/objectives`, phase: 'PRE-EVENT' },
    { key: 'guest-intelligence', label: 'Guest Intelligence', href: `/dashboard/${eventId}/guest-intelligence`, phase: 'PRE-EVENT' },
    { key: 'campaigns', label: 'Invitations', href: `/dashboard/${eventId}/campaigns`, phase: 'PRE-EVENT' },
    { key: 'briefings', label: 'Briefings', href: `/dashboard/${eventId}/briefings`, phase: 'PRE-EVENT' },
    { key: 'day-of', label: 'Check-in & Seating', href: `/dashboard/${eventId}/day-of`, phase: 'EVENT DAY' },
    { key: 'follow-up', label: 'Follow-Up', href: `/dashboard/${eventId}/follow-up`, phase: 'POST-EVENT' },
    { key: 'analytics', label: 'Analytics', href: `/dashboard/${eventId}/analytics`, phase: 'POST-EVENT' },
  ]

  const activeTab = tabs.find(tab => pathname?.startsWith(tab.href))?.key || 'overview'

  // Group tabs by phase for rendering dividers
  let lastPhase: PhaseLabel | null = null

  return (
    <nav className="-mb-px">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab, idx) => {
          const phaseChanged = tab.phase !== lastPhase
          lastPhase = tab.phase

          // Show divider between phase groups (not before first)
          const showDivider = phaseChanged && idx > 0
          // Only show phase label for non-null phases when phase changes
          const showPhaseLabel = phaseChanged && tab.phase !== null

          return (
            <div key={tab.key} className="flex items-center">
              {showDivider && (
                <div className="h-5 w-px bg-ui-border mx-3 shrink-0" />
              )}
              {showPhaseLabel && (
                <span className="text-[13px] font-semibold text-ui-tertiary uppercase tracking-wider mr-2 shrink-0 hidden lg:inline">
                  {tab.phase}
                </span>
              )}
              <Link
                href={tab.href}
                className={`
                  relative py-4 px-3 text-base font-semibold whitespace-nowrap transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta focus-visible:ring-offset-2 rounded-sm
                  ${activeTab === tab.key
                    ? 'text-brand-charcoal'
                    : 'text-ui-tertiary hover:text-brand-charcoal'
                  }
                `}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-terracotta" />
                )}
              </Link>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
