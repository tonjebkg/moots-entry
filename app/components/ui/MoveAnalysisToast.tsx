'use client';

import { useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { AgentAvatar } from '@/app/components/ui/AgentAvatar';

interface MoveAnalysisToastProps {
  analysis: string;
  suggestion: string | null;
  onDismiss: () => void;
}

export function MoveAnalysisToast({ analysis, suggestion, onDismiss }: MoveAnalysisToastProps) {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="bg-brand-cream border border-brand-terracotta/20 rounded-card p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <AgentAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-brand-charcoal">{analysis}</p>
          {suggestion && (
            <div className="mt-2 flex items-start gap-2 text-xs text-brand-terracotta">
              <Lightbulb size={12} className="shrink-0 mt-0.5" />
              <span>{suggestion}</span>
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 text-ui-tertiary hover:text-brand-charcoal rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
