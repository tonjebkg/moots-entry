'use client'

import Link from 'next/link'
import { AlertCircle, Users, Sparkles, Brain, Target, AlertTriangle, Mail, Send, UserCheck } from 'lucide-react'

interface AttentionItem {
  type: string
  count: number
  label: string
  action?: string
}

interface NeedsAttentionSectionProps {
  items: AttentionItem[]
  eventId: string
}

const ITEM_CONFIG: Record<string, { icon: React.ElementType; href: (eventId: string) => string; defaultAction: string }> = {
  event_day: {
    icon: UserCheck,
    href: (id) => `/dashboard/${id}/day-of`,
    defaultAction: 'Open Check-in',
  },
  over_capacity: {
    icon: AlertTriangle,
    href: (id) => `/dashboard/${id}/campaigns`,
    defaultAction: 'Manage Invitations',
  },
  awaiting_rsvp: {
    icon: Mail,
    href: (id) => `/dashboard/${id}/campaigns`,
    defaultAction: 'View in Campaigns',
  },
  pending_review: {
    icon: Users,
    href: (id) => `/dashboard/${id}/guest-intelligence?filter=pending`,
    defaultAction: 'Review',
  },
  high_score_not_invited: {
    icon: Sparkles,
    href: (id) => `/dashboard/${id}/guest-intelligence?filter=high_uninvited`,
    defaultAction: 'Invite',
  },
  unscored_contacts: {
    icon: Brain,
    href: (id) => `/dashboard/${id}/guest-intelligence?action=score`,
    defaultAction: 'Run AI Scoring',
  },
  no_objectives: {
    icon: Target,
    href: (id) => `/dashboard/${id}/objectives`,
    defaultAction: 'Set Up',
  },
}

export function NeedsAttentionSection({ items, eventId }: NeedsAttentionSectionProps) {
  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-card shadow-card border-l-4 border-l-brand-terracotta overflow-hidden">
      <div className="px-5 py-4 border-b border-ui-border">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-brand-terracotta" />
          <h3 className="text-sm font-semibold text-brand-charcoal">Needs Attention</h3>
        </div>
      </div>
      <div className="divide-y divide-ui-border">
        {items.map((item) => {
          const config = ITEM_CONFIG[item.type] || { icon: AlertCircle, href: () => '#', defaultAction: 'View' }
          const Icon = config.icon
          return (
            <div key={item.type} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-terracotta/10 flex items-center justify-center">
                  <Icon size={15} className="text-brand-terracotta" />
                </div>
                <span className="text-sm text-brand-charcoal">
                  <strong>{item.count}</strong> {item.label}
                </span>
              </div>
              <Link
                href={config.href(eventId)}
                className="px-3 py-1.5 text-xs font-semibold text-brand-terracotta hover:bg-brand-terracotta/5 rounded-md transition-colors"
              >
                {item.action || config.defaultAction} →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
