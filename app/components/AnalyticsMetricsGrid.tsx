'use client';

import { Users, Target, Mail, CheckCircle, UserPlus, MessageSquare, Calendar, Radio } from 'lucide-react';

interface HeadlineMetrics {
  guest_pool: number;
  scored: number;
  invited: number;
  accepted: number;
  checked_in: number;
  walk_ins: number;
  follow_ups_sent: number;
  meetings_booked: number;
  broadcasts_sent: number;
}

interface AnalyticsMetricsGridProps {
  metrics: HeadlineMetrics;
}

export function AnalyticsMetricsGrid({ metrics }: AnalyticsMetricsGridProps) {
  const cards = [
    { label: 'Guest Pool', value: metrics.guest_pool, icon: Users, color: 'text-ui-tertiary', bg: 'bg-brand-cream' },
    { label: 'AI Scored', value: metrics.scored, icon: Target, color: 'text-brand-terracotta', bg: 'bg-blue-50' },
    { label: 'Invited', value: metrics.invited, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Accepted', value: metrics.accepted, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Checked In', value: metrics.checked_in, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Walk-ins', value: metrics.walk_ins, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Follow-ups', value: metrics.follow_ups_sent, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Meetings', value: metrics.meetings_booked, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Broadcasts', value: metrics.broadcasts_sent, icon: Radio, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.bg} border border-ui-border rounded-lg p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={card.color} />
              <span className="text-xs font-semibold text-ui-tertiary uppercase">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}
