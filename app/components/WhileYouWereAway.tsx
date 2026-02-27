'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, ExternalLink, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AgentAvatar } from '@/app/components/ui/AgentAvatar';
import type { AgentActivityEntry } from '@/lib/agent/activity';

interface WhileYouWereAwayProps {
  activities: AgentActivityEntry[];
}

const TYPE_EMOJI: Record<string, string> = {
  scoring: 'Scored',
  enrichment: 'Enriched',
  briefing: 'Generated briefing',
  seating: 'Updated seating',
  introduction: 'Found introductions',
  follow_up: 'Drafted follow-ups',
  observation: 'Noticed',
};

// Map suggestion_type to navigation targets
const SUGGESTION_NAV: Record<string, { tab: string; label: string }> = {
  uninvited_high_scorers: { tab: 'objectives', label: 'Review in Guest Intelligence' },
  competitor_conflict: { tab: 'day-of', label: 'Review Seating' },
  stale_follow_ups: { tab: 'overview', label: 'Review Follow-ups' },
  unscored_contacts: { tab: 'objectives', label: 'Review Scoring' },
  pending_invitations: { tab: 'overview', label: 'Review Invitations' },
};

function isSuggestion(activity: AgentActivityEntry): boolean {
  return (
    activity.activity_type === 'observation' &&
    typeof activity.metadata?.suggestion_type === 'string'
  );
}

export function WhileYouWereAway({ activities }: WhileYouWereAwayProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`wywa_dismissed_${eventId}`);
      if (stored) setDismissedIds(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, [eventId]);

  function dismiss(id: string) {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`wywa_dismissed_${eventId}`, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }

  const visible = activities.filter(a => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  // Split into actions and suggestions
  const suggestions = visible.filter(isSuggestion);
  const actions = visible.filter(a => !isSuggestion(a));

  // Group actions by type for summary
  const byType: Record<string, number> = {};
  for (const a of actions) {
    byType[a.activity_type] = (byType[a.activity_type] || 0) + 1;
  }

  const summaryParts = Object.entries(byType).map(([type, count]) => {
    const label = TYPE_EMOJI[type] || type;
    return `${count} ${label.toLowerCase()}${count > 1 ? ' actions' : ''}`;
  });

  if (suggestions.length > 0) {
    summaryParts.push(`${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}`);
  }

  return (
    <div className="bg-gradient-to-r from-brand-terracotta/5 to-brand-forest/5 border border-brand-terracotta/20 rounded-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-brand-terracotta/5 transition-colors"
      >
        <AgentAvatar size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-charcoal">
            While you were away
          </p>
          <p className="text-xs text-ui-secondary mt-0.5">
            {summaryParts.join(' · ')}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-terracotta bg-brand-terracotta/10 px-2 py-1 rounded-full">
            {visible.length} update{visible.length !== 1 ? 's' : ''}
          </span>
          {expanded ? <ChevronUp size={16} className="text-ui-tertiary" /> : <ChevronDown size={16} className="text-ui-tertiary" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 animate-fade-in">
          {/* Suggestions section */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map(activity => {
                const suggestionType = activity.metadata?.suggestion_type as string;
                const nav = SUGGESTION_NAV[suggestionType];

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pl-11 border-l-2 border-brand-terracotta/40 ml-2 py-1"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-charcoal">
                        {activity.headline}
                      </p>
                      {activity.detail && (
                        <p className="text-xs text-ui-secondary mt-0.5">{activity.detail}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {nav && (
                          <button
                            onClick={() => router.push(`/dashboard/${eventId}/${nav.tab}`)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-terracotta hover:text-brand-terracotta/80 transition-colors"
                          >
                            <ExternalLink size={10} />
                            {nav.label}
                          </button>
                        )}
                        <button
                          onClick={() => dismiss(activity.id)}
                          className="inline-flex items-center gap-1 text-xs text-ui-tertiary hover:text-brand-charcoal transition-colors"
                        >
                          <X size={10} />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions section */}
          {actions.slice(0, 10).map(activity => (
            <div key={activity.id} className="flex items-start gap-3 pl-11">
              <Sparkles size={12} className="text-brand-terracotta shrink-0 mt-1" />
              <div className="text-sm text-ui-secondary">
                <span className="font-medium text-brand-charcoal">{activity.headline}</span>
                {activity.detail && (
                  <span className="text-ui-tertiary"> — {activity.detail}</span>
                )}
              </div>
            </div>
          ))}
          {actions.length > 10 && (
            <p className="text-xs text-ui-tertiary pl-11">
              ...and {actions.length - 10} more updates
            </p>
          )}
        </div>
      )}
    </div>
  );
}
