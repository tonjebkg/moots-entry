'use client';

import { useState, useEffect } from 'react';

interface SuggestedPromptsProps {
  page: string;
  eventId?: string;
  tab?: string;
  onSelect: (prompt: string) => void;
}

// ─── Static fallbacks per page ───────────────────────────────────────────────
const STATIC_FALLBACKS: Record<string, string[]> = {
  'events-list': [
    'Which event needs the most attention?',
    'Compare acceptance rates across my events',
    'Any guest overlaps between upcoming events?',
  ],
  people: [
    'Who are my most engaged contacts?',
    'Find contacts not invited in 6+ months',
    'Which contacts match multiple criteria?',
  ],
  'event:overview': [
    "What needs my attention before the event?",
    "What's the strategic profile of confirmed guests?",
    'Any risks I should know about?',
  ],
  'event:context': [
    "What's the strategic context for this event?",
    'Summarize the event goals',
    'Who are the key stakeholders?',
  ],
  'event:guest-intelligence': [
    'Who are my highest-priority guests?',
    'Which guests need attention?',
    'Summarize the guest mix',
  ],
  'event:day-of': [
    "Who hasn't arrived yet?",
    "How's check-in going?",
    'Any walk-ins to note?',
  ],
  'event:default': [
    'Who are my top 5 guests?',
    'Summarize the event status',
    "Who hasn't responded yet?",
  ],
};

function getFallback(page: string, tab?: string): string[] {
  if (page === 'events-list' || page === 'people') {
    return STATIC_FALLBACKS[page] || STATIC_FALLBACKS['events-list'];
  }
  const key = `event:${tab || 'default'}`;
  return STATIC_FALLBACKS[key] || STATIC_FALLBACKS['event:default'];
}

/**
 * Dynamic suggested prompt pills.
 * Fetches contextual prompts from /api/agent/prompts, falls back to static.
 * Renders branded pills with staggered fade-in animation.
 */
export function SuggestedPrompts({ page, eventId, tab, onSelect }: SuggestedPromptsProps) {
  const [prompts, setPrompts] = useState<string[]>(getFallback(page, tab));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ page });
    if (eventId) params.set('eventId', eventId);
    if (tab) params.set('tab', tab);

    // Race: fetch vs 1.5s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    fetch(`/api/agent/prompts?${params}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.prompts) && data.prompts.length >= 3) {
          setPrompts(data.prompts.slice(0, 3));
        }
      })
      .catch(() => {
        // Timeout or error — keep static fallbacks
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoaded(true);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [page, eventId, tab]);

  // Show immediately with static fallbacks, then swap when API responds
  useEffect(() => {
    // Trigger loaded state after a brief delay to allow animation
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mb-2">
      <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-wider mb-1.5 block">
        Ask Moots
      </span>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {prompts.map((prompt, i) => (
          <button
            key={`${prompt}-${i}`}
            onClick={() => onSelect(prompt)}
            className="shrink-0 text-sm px-4 py-2 rounded-full bg-[#FAF8F5] text-brand-charcoal border border-[#B05C3B]/30 hover:bg-[#F0EBE5] hover:shadow-sm transition-all cursor-pointer font-medium"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 0.3s ease ${i * 75}ms, transform 0.3s ease ${i * 75}ms`,
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
