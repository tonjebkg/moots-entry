'use client'

import { Star, UsersRound } from 'lucide-react'

interface GuestBadgesProps {
  tags?: string[] | null
  tier?: string | null
  isTeamMember?: boolean
  compact?: boolean // for table rows
}

const TIER_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  TIER_1: { label: 'T1', bg: 'bg-brand-charcoal', text: 'text-white' },
  TIER_2: { label: 'T2', bg: 'bg-brand-charcoal/60', text: 'text-white' },
  TIER_3: { label: 'T3', bg: 'bg-gray-200', text: 'text-gray-600' },
}

export function GuestBadges({ tags, tier, isTeamMember, compact }: GuestBadgesProps) {
  const isVip = (tags || []).some(t => t.toLowerCase() === 'vip')
  const tierStyle = tier ? TIER_STYLES[tier] : null
  const hasBadges = isVip || tierStyle || isTeamMember

  if (!hasBadges) return null

  return (
    <span className={`inline-flex items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {isVip && (
        <span
          className={`inline-flex items-center ${compact ? 'gap-0.5' : 'gap-1'} text-amber-500`}
          title="VIP Guest"
        >
          <Star size={compact ? 12 : 14} fill="currentColor" />
        </span>
      )}
      {tierStyle && (
        <span
          className={`inline-flex items-center justify-center ${compact ? 'w-5 h-4 text-[9px]' : 'w-6 h-5 text-[10px]'} font-bold rounded ${tierStyle.bg} ${tierStyle.text}`}
          title={`Tier ${tier?.split('_')[1]}`}
        >
          {tierStyle.label}
        </span>
      )}
      {isTeamMember && (
        <span
          className={`inline-flex items-center text-blue-500`}
          title="Team Member"
        >
          <UsersRound size={compact ? 12 : 14} />
        </span>
      )}
    </span>
  )
}
