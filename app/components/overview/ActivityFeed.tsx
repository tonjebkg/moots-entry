'use client'

import { AvatarInitials } from '@/app/components/ui/AvatarInitials'
import { AgentAvatar } from '@/app/components/ui/AgentAvatar'
import { Clock, Sparkles } from 'lucide-react'
import { formatUSDateShort } from '@/lib/datetime'

interface ActivityItem {
  actor: string
  action: string
  timestamp: string
  contact_id?: string | null
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  onContactClick?: (contactId: string) => void
}

function timeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return formatUSDateShort(date)
}

export function ActivityFeed({ activities, onContactClick }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <Sparkles size={28} className="mx-auto mb-2 text-brand-terracotta opacity-60" />
        <p className="text-sm text-ui-secondary">I&apos;m ready to start working on your event. Set objectives and I&apos;ll begin analyzing your guest pool.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-ui-border">
        <h3 className="text-sm font-semibold text-brand-charcoal">Recent Activity</h3>
      </div>
      <div className="divide-y divide-ui-border">
        {activities.map((activity, idx) => {
          const isAgent = activity.actor === 'Moots' || activity.actor === 'System' || activity.actor === 'system'
          return (
          <div key={idx} className="flex items-center gap-3 px-5 py-3">
            {isAgent ? (
              <AgentAvatar size="sm" />
            ) : (
              <AvatarInitials
                name={activity.actor || 'System'}
                size={28}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-brand-charcoal">
                {activity.contact_id && onContactClick ? (
                  <button
                    onClick={() => onContactClick(activity.contact_id!)}
                    className="font-medium hover:text-brand-terracotta hover:underline transition-colors text-left"
                  >
                    {activity.actor}
                  </button>
                ) : (
                  <span className="font-medium">{activity.actor}</span>
                )}{' '}
                <span className="text-ui-secondary">{activity.action}</span>
              </p>
            </div>
            <span className="text-xs text-ui-tertiary shrink-0">
              {timeAgo(activity.timestamp)}
            </span>
          </div>
          )
        })}
      </div>
    </div>
  )
}
