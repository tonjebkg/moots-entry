'use client'

import Link from 'next/link'
import { Target, Sparkles, Users, UserCheck } from 'lucide-react'

interface QuickActionsProps {
  eventId: string
  hasObjectives: boolean
  hasScoredContacts: boolean
  hasPendingGuests: boolean
  isEventDay: boolean
}

export function QuickActions({
  eventId,
  hasObjectives,
  hasScoredContacts,
  hasPendingGuests,
  isEventDay,
}: QuickActionsProps) {
  const actions: { label: string; icon: React.ElementType; href: string; show: boolean }[] = [
    {
      label: 'Set Objectives',
      icon: Target,
      href: `/dashboard/${eventId}/objectives`,
      show: !hasObjectives,
    },
    {
      label: 'Run AI Scoring',
      icon: Sparkles,
      href: `/dashboard/${eventId}/guest-intelligence`,
      show: hasObjectives && !hasScoredContacts,
    },
    {
      label: 'Review Pending Guests',
      icon: Users,
      href: `/dashboard/${eventId}/guest-intelligence`,
      show: hasPendingGuests,
    },
    {
      label: 'Open Check-in',
      icon: UserCheck,
      href: `/dashboard/${eventId}/day-of`,
      show: isEventDay,
    },
  ]

  const visibleActions = actions.filter(a => a.show)

  if (visibleActions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visibleActions.map(action => {
        const Icon = action.icon
        return (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-ui-border rounded-pill text-sm font-semibold text-brand-charcoal hover:border-brand-terracotta hover:text-brand-terracotta transition-colors shadow-sm"
          >
            <Icon size={15} />
            {action.label}
          </Link>
        )
      })}
    </div>
  )
}
