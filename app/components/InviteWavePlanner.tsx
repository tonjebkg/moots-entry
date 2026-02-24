'use client';

import { Send, Clock } from 'lucide-react';

interface TierCounts {
  tier_1: number;
  tier_2: number;
  tier_3: number;
  waitlist: number;
}

interface InviteWavePlannerProps {
  counts: TierCounts;
  consideringCounts: TierCounts;
  invitedCounts: TierCounts;
  onSendTier: (tier: 'TIER_1' | 'TIER_2' | 'TIER_3') => void;
  disabled?: boolean;
}

export function InviteWavePlanner({
  counts,
  consideringCounts,
  invitedCounts,
  onSendTier,
  disabled = false,
}: InviteWavePlannerProps) {
  const tiers = [
    { key: 'tier_1' as const, label: 'Tier 1', tier: 'TIER_1' as const, description: 'First wave (VIP guests)' },
    { key: 'tier_2' as const, label: 'Tier 2', tier: 'TIER_2' as const, description: 'Second wave' },
    { key: 'tier_3' as const, label: 'Tier 3', tier: 'TIER_3' as const, description: 'Third wave' },
  ];

  return (
    <div className="bg-white border border-ui-border rounded-lg shadow-sm p-5">
      <h3 className="text-base font-bold text-brand-charcoal mb-1 tracking-tight">Invitation Waves</h3>
      <p className="text-sm text-ui-tertiary mb-5 leading-relaxed">
        Send RSVP invitations by tier. Start with Tier 1 (VIPs), then proceed to Tier 2 and Tier 3.
      </p>

      <div className="space-y-2">
        {tiers.map(({ key, label, tier, description }) => {
          const total = counts[key];
          const considering = consideringCounts[key];
          const invited = invitedCounts[key];
          const canSend = considering > 0;

          return (
            <div key={key} className="p-3 bg-brand-cream border border-ui-border rounded-lg">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h4 className="font-semibold text-brand-charcoal text-sm">{label}</h4>
                    <span className="text-xs text-ui-tertiary">{description}</span>
                  </div>
                  <div className="text-xs text-ui-secondary leading-relaxed">
                    <span className="font-medium text-brand-charcoal">{total}</span> total
                    <span className="text-ui-tertiary mx-1">•</span>
                    <span className="text-ui-tertiary">{considering} considering</span>
                    <span className="text-ui-tertiary mx-1">•</span>
                    <span className="text-brand-terracotta font-medium">{invited} invited</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSendTier(tier)}
                disabled={disabled || !canSend}
                className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
                  disabled || !canSend
                    ? 'bg-brand-cream text-ui-tertiary cursor-not-allowed border border-ui-border'
                    : 'bg-brand-terracotta text-white hover:bg-brand-terracotta/90 active:bg-brand-terracotta/90 shadow-sm'
                }`}
              >
                {canSend && <Send size={12} />}
                {canSend ? `Send to ${considering}` : 'All invited'}
              </button>
            </div>
          );
        })}
      </div>

      {counts.waitlist > 0 && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-700 shrink-0" />
            <span className="text-sm font-semibold text-amber-900">{counts.waitlist} guests on waitlist</span>
          </div>
        </div>
      )}
    </div>
  );
}
