'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface EventTabNavigationProps {
  eventId: string
}

type TabKey = 'overview' | 'guests' | 'campaigns' | 'objectives' | 'scoring' | 'seating' | 'checkin' | 'briefings' | 'broadcast' | 'follow-up' | 'rsvp-page'

export function EventTabNavigation({ eventId }: EventTabNavigationProps) {
  const pathname = usePathname()

  const tabs: { key: TabKey; label: string; href: string }[] = [
    { key: 'overview', label: 'Overview', href: `/dashboard/${eventId}/overview` },
    { key: 'guests', label: 'Guests', href: `/dashboard/${eventId}/guests` },
    { key: 'campaigns', label: 'Campaigns', href: `/dashboard/${eventId}/campaigns` },
    { key: 'objectives', label: 'Objectives', href: `/dashboard/${eventId}/objectives` },
    { key: 'scoring', label: 'AI Scoring', href: `/dashboard/${eventId}/scoring` },
    { key: 'seating', label: 'Seating', href: `/dashboard/${eventId}/seating` },
    { key: 'checkin', label: 'Check-in', href: `/dashboard/${eventId}/checkin` },
    { key: 'briefings', label: 'Briefings', href: `/dashboard/${eventId}/briefings` },
    { key: 'broadcast', label: 'Broadcast', href: `/dashboard/${eventId}/broadcast` },
    { key: 'follow-up', label: 'Follow-Up', href: `/dashboard/${eventId}/follow-up` },
    { key: 'rsvp-page', label: 'RSVP Page', href: `/dashboard/${eventId}/rsvp-page` },
  ]

  const activeTab = tabs.find(tab => pathname?.startsWith(tab.href))?.key || 'overview'

  return (
    <nav className="-mb-px">
      <div className="flex gap-8 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`
              relative py-4 text-sm font-semibold whitespace-nowrap transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3460] focus-visible:ring-offset-2 rounded-sm
              ${activeTab === tab.key
                ? 'text-[#1a1a2e]'
                : 'text-[#6e6e7e] hover:text-[#1a1a2e]'
              }
            `}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0f3460] rounded-t-full" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
