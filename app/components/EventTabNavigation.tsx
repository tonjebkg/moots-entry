'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Megaphone, Send, Globe } from 'lucide-react'

interface EventTabNavigationProps {
  eventId: string
}

type PhaseLabel = 'PRE-EVENT' | 'EVENT DAY' | 'POST-EVENT'

type TabDef = {
  key: string
  label: string
  href: string
  phase: PhaseLabel
}

type MoreItem = {
  key: string
  label: string
  href: string
  icon: React.ElementType
}

export function EventTabNavigation({ eventId }: EventTabNavigationProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const tabs: TabDef[] = [
    { key: 'overview', label: 'Overview', href: `/dashboard/${eventId}/overview`, phase: 'PRE-EVENT' },
    { key: 'objectives', label: 'Objectives', href: `/dashboard/${eventId}/objectives`, phase: 'PRE-EVENT' },
    { key: 'guest-intelligence', label: 'Guest Intelligence', href: `/dashboard/${eventId}/guest-intelligence`, phase: 'PRE-EVENT' },
    { key: 'briefings', label: 'Briefings', href: `/dashboard/${eventId}/briefings`, phase: 'PRE-EVENT' },
    { key: 'day-of', label: 'Check-in & Seating', href: `/dashboard/${eventId}/day-of`, phase: 'EVENT DAY' },
    { key: 'follow-up', label: 'Follow-Up', href: `/dashboard/${eventId}/follow-up`, phase: 'POST-EVENT' },
    { key: 'analytics', label: 'Analytics', href: `/dashboard/${eventId}/analytics`, phase: 'POST-EVENT' },
  ]

  const moreItems: MoreItem[] = [
    { key: 'campaigns', label: 'Campaigns', href: `/dashboard/${eventId}/campaigns`, icon: Send },
    { key: 'broadcast', label: 'Broadcast', href: `/dashboard/${eventId}/broadcast`, icon: Megaphone },
    { key: 'rsvp-page', label: 'RSVP Page', href: `/dashboard/${eventId}/rsvp-page`, icon: Globe },
  ]

  const activeTab = tabs.find(tab => pathname?.startsWith(tab.href))?.key
    || moreItems.find(item => pathname?.startsWith(item.href))?.key
    || 'overview'

  const isMoreActive = moreItems.some(item => pathname?.startsWith(item.href))

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [moreOpen])

  // Group tabs by phase for rendering dividers
  let lastPhase: PhaseLabel | null = null

  return (
    <nav className="-mb-px">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab, idx) => {
          const showPhaseLabel = tab.phase !== lastPhase
          lastPhase = tab.phase

          // Show divider between phase groups (not before first)
          const showDivider = showPhaseLabel && idx > 0

          return (
            <div key={tab.key} className="flex items-center">
              {showDivider && (
                <div className="h-5 w-px bg-ui-border mx-3 shrink-0" />
              )}
              {showPhaseLabel && (
                <span className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider mr-2 shrink-0 hidden lg:inline">
                  {tab.phase}
                </span>
              )}
              <Link
                href={tab.href}
                className={`
                  relative py-4 px-3 text-sm font-semibold whitespace-nowrap transition-all duration-200
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

        {/* Divider before More */}
        <div className="h-5 w-px bg-ui-border mx-3 shrink-0" />

        {/* More Dropdown */}
        <div ref={moreRef} className="relative shrink-0">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`
              flex items-center gap-1.5 py-4 px-3 text-sm font-semibold whitespace-nowrap transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta focus-visible:ring-offset-2 rounded-sm
              ${isMoreActive
                ? 'text-brand-charcoal'
                : 'text-ui-tertiary hover:text-brand-charcoal'
              }
            `}
          >
            More
            <ChevronDown size={14} className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
            {isMoreActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-terracotta" />
            )}
          </button>

          {moreOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-card shadow-lg border border-ui-border py-1 z-50">
              {moreItems.map(item => {
                const Icon = item.icon
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors
                      ${isActive
                        ? 'text-brand-terracotta bg-brand-terracotta/5'
                        : 'text-brand-charcoal hover:bg-brand-cream'
                      }
                    `}
                  >
                    <Icon size={15} className={isActive ? 'text-brand-terracotta' : 'text-ui-tertiary'} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
