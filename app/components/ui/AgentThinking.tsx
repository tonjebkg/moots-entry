'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AgentThinkingProps {
  steps: string[];
  intervalMs?: number;
  className?: string;
}

/**
 * Progressive narrative "thinking" component.
 * Rotates through descriptive steps to show the agent's work in progress.
 * Replaces generic "Loading..." and "Generating..." text.
 */
export function AgentThinking({ steps, intervalMs = 3000, className = '' }: AgentThinkingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % steps.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [steps.length, intervalMs]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Sparkles size={14} className="text-brand-terracotta animate-pulse shrink-0" />
      <span
        key={currentIndex}
        className="text-sm text-ui-secondary animate-fade-in"
      >
        {steps[currentIndex]}
      </span>
    </div>
  );
}

/** Pre-defined step sets for common operations */
export const THINKING_STEPS = {
  scoring: (contactCount?: number) => [
    'Reviewing your targeting criteria...',
    `Scanning ${contactCount ?? 'your'} contacts...`,
    'Matching profiles against criteria...',
    'Cross-referencing industries and seniority...',
    'Calculating relevance scores...',
  ],
  seating: [
    'Analyzing guest profiles and objectives...',
    'Checking for industry and competitor overlaps...',
    'Balancing tables for conversation dynamics...',
    'Optimizing seat assignments...',
    'Generating placement rationale...',
  ],
  briefing: [
    'Reviewing confirmed guest profiles...',
    'Identifying key talking points...',
    'Analyzing shared interests and backgrounds...',
    'Preparing strategic conversation starters...',
    'Compiling your briefing packet...',
  ],
  introductions: [
    'Analyzing guest backgrounds and interests...',
    'Identifying complementary profiles...',
    'Evaluating potential business value...',
    'Ranking introduction priority...',
    'Preparing pairing rationale...',
  ],
  followUp: [
    'Reviewing attendee interactions...',
    'Analyzing guest profiles for personalization...',
    'Drafting personalized follow-up content...',
    'Adding conversation-specific references...',
  ],
  enrichment: (contactCount?: number) => [
    `Researching ${contactCount ?? 'your'} contacts...`,
    'Verifying titles and companies...',
    'Identifying industry and seniority...',
    'Generating AI profile summaries...',
  ],
};
