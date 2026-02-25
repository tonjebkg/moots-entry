'use client'

import { AvatarInitials } from '@/app/components/ui/AvatarInitials'
import { Clock } from 'lucide-react'

interface ActivityItem {
  actor: string
  action: string
  timestamp: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <Clock size={28} className="mx-auto mb-2 text-ui-tertiary opacity-50" />
        <p className="text-sm text-ui-tertiary">No recent activity yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-ui-border">
        <h3 className="text-sm font-semibold text-brand-charcoal">Recent Activity</h3>
      </div>
      <div className="divide-y divide-ui-border">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-center gap-3 px-5 py-3">
            <AvatarInitials
              name={activity.actor || 'System'}
              size={28}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-brand-charcoal">
                <span className="font-medium">{activity.actor}</span>{' '}
                <span className="text-ui-secondary">{activity.action}</span>
              </p>
            </div>
            <span className="text-xs text-ui-tertiary shrink-0">
              {timeAgo(activity.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
