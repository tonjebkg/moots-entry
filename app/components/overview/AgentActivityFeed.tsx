'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles, ExternalLink } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AgentAvatar } from '@/app/components/ui/AgentAvatar';
import type { AgentActivityEntry } from '@/lib/agent/activity';

const SUGGESTION_NAV: Record<string, { tab: string; label: string }> = {
  uninvited_high_scorers: { tab: 'objectives', label: 'View' },
  competitor_conflict: { tab: 'day-of', label: 'View' },
  stale_follow_ups: { tab: 'overview', label: 'View' },
  unscored_contacts: { tab: 'objectives', label: 'View' },
  pending_invitations: { tab: 'overview', label: 'View' },
};

interface AgentActivityFeedProps {
  activities: AgentActivityEntry[];
}

const TYPE_LABELS: Record<string, string> = {
  scoring: 'Scoring',
  enrichment: 'Enrichment',
  briefing: 'Briefing',
  seating: 'Seating',
  introduction: 'Introductions',
  follow_up: 'Follow-Up',
  observation: 'Observation',
};

const TYPE_COLORS: Record<string, string> = {
  scoring: 'bg-blue-50 text-blue-700 border-blue-200',
  enrichment: 'bg-purple-50 text-purple-700 border-purple-200',
  briefing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  seating: 'bg-amber-50 text-amber-700 border-amber-200',
  introduction: 'bg-rose-50 text-rose-700 border-rose-200',
  follow_up: 'bg-teal-50 text-teal-700 border-teal-200',
  observation: 'bg-brand-cream text-brand-terracotta border-brand-terracotta/20',
};

function timeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export function AgentActivityFeed({ activities }: AgentActivityFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <Sparkles size={28} className="mx-auto mb-2 text-brand-terracotta opacity-60" />
        <p className="text-[15px] text-ui-secondary">
          I&apos;m ready to start working on your event. Set objectives and I&apos;ll begin analyzing your guest pool.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-ui-border flex items-center gap-2">
        <AgentAvatar size="sm" />
        <h3 className="text-xl font-semibold text-brand-charcoal">AI Agent Activity</h3>
      </div>
      <div className="divide-y divide-ui-border">
        {activities.map(activity => {
          const isExpanded = expandedId === activity.id;
          const colorClass = TYPE_COLORS[activity.activity_type] || TYPE_COLORS.observation;
          const suggestionType = activity.metadata?.suggestion_type as string | undefined;
          const isSuggestion = activity.activity_type === 'observation' && suggestionType;
          const nav = suggestionType ? SUGGESTION_NAV[suggestionType] : undefined;

          return (
            <div key={activity.id} className={`px-5 py-3${isSuggestion ? ' border-l-2 border-brand-terracotta/40' : ''}`}>
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : activity.id)}
              >
                <AgentAvatar size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border ${colorClass}`}>
                      {isSuggestion ? 'Suggestion' : (TYPE_LABELS[activity.activity_type] || activity.activity_type)}
                    </span>
                    <span className="text-[14px] text-ui-tertiary">
                      {timeAgo(activity.created_at)}
                    </span>
                  </div>
                  <p className="text-base text-brand-charcoal">{activity.headline}</p>
                </div>
                {activity.detail && (
                  <div className="shrink-0 mt-1 text-ui-tertiary">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                )}
              </div>
              {isExpanded && activity.detail && (
                <div className="ml-9 mt-2 text-base text-ui-secondary bg-brand-cream rounded-lg p-3 animate-fade-in">
                  {activity.detail}
                  {nav && (
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/${eventId}/${nav.tab}`); }}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-terracotta hover:text-brand-terracotta/80 transition-colors"
                    >
                      <ExternalLink size={10} />
                      {nav.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
