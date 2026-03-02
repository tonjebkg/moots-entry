'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Edit2 } from 'lucide-react'
import { CollaboratorAvatarStack } from '@/app/components/CollaboratorAvatarStack'
import { AvatarInitials } from '@/app/components/ui/AvatarInitials'
import { useEventScroll } from '@/app/components/EventScrollContext'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface EventInfo {
  title: string
  location: string
  date: string
  eventId: string
}

interface DashboardHeaderProps {
  activeNav?: 'events' | 'people'
  rightSlot?: React.ReactNode
  userName?: string
  teamMembers?: TeamMember[]
  eventInfo?: EventInfo
}

export function DashboardHeader({ activeNav, rightSlot, userName, teamMembers = [], eventInfo }: DashboardHeaderProps) {
  const pathname = usePathname()
  const { isStuck } = useEventScroll()

  // Auto-detect active nav from pathname if not explicitly set
  const active = activeNav ?? (pathname?.startsWith('/dashboard/people') ? 'people' : 'events')

  const showCondensed = isStuck && eventInfo

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-ui-border z-50">
      <div className="px-8 py-4 flex items-center">
        <div className="flex items-center gap-8 shrink-0">
          <Link href="/dashboard" className="font-display text-2xl font-bold text-brand-charcoal hover:text-brand-terracotta transition-colors">
            Moots
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-base font-semibold pb-0.5 border-b-2 transition-colors ${
                active === 'events'
                  ? 'text-brand-terracotta border-brand-terracotta'
                  : 'text-ui-tertiary border-transparent hover:text-brand-charcoal'
              }`}
            >
              Events
            </Link>
            <Link
              href="/dashboard/people"
              className={`text-base font-semibold pb-0.5 border-b-2 transition-colors ${
                active === 'people'
                  ? 'text-brand-terracotta border-brand-terracotta'
                  : 'text-ui-tertiary border-transparent hover:text-brand-charcoal'
              }`}
            >
              People
            </Link>
          </nav>
        </div>

        {/* Center: condensed event info — appears inline when event header scrolls away */}
        <div className="flex-1 min-w-0 px-6">
          {showCondensed && (
            <p className="text-sm font-medium text-brand-charcoal truncate text-center">
              {eventInfo.title}
              <span className="text-ui-tertiary font-normal">
                {' '}&middot; {eventInfo.location} &middot; {eventInfo.date}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {showCondensed && (
            <button
              onClick={() => {
                // TODO: Open edit event modal
                alert('Edit Event modal - to be implemented')
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-ui-border hover:border-brand-terracotta text-brand-charcoal text-sm font-semibold rounded-lg transition-colors"
            >
              <Edit2 size={14} />
              Edit Event
            </button>
          )}
          {rightSlot}
          <Link
            href="/dashboard/settings"
            className="p-2 text-ui-tertiary hover:text-brand-terracotta transition-colors rounded-lg hover:bg-brand-cream"
            title="Settings"
          >
            <Settings size={18} />
          </Link>
          {teamMembers.length > 0 ? (
            <CollaboratorAvatarStack members={teamMembers} />
          ) : userName ? (
            <AvatarInitials name={userName} size={32} />
          ) : null}
        </div>
      </div>
    </header>
  )
}
