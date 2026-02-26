'use client';

import { useState } from 'react';
import { Sparkles, ArrowLeftRight, Copy, Check } from 'lucide-react';

interface Pairing {
  id: string;
  contact_a_name?: string;
  contact_a_company?: string;
  contact_b_name?: string;
  contact_b_company?: string;
  reason: string;
  mutual_interest: string | null;
  priority: number;
}

interface IntroductionPairingsProps {
  pairings: Pairing[];
  onGenerate?: () => void;
  generating?: boolean;
}

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Must Meet', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  2: { label: 'High', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  3: { label: 'Nice to Have', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function IntroductionPairings({ pairings, onGenerate, generating }: IntroductionPairingsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleFacilitate(pairing: Pairing) {
    const nameA = pairing.contact_a_name || 'Guest A';
    const nameB = pairing.contact_b_name || 'Guest B';
    const companyA = pairing.contact_a_company ? ` (${pairing.contact_a_company})` : '';
    const companyB = pairing.contact_b_company ? ` (${pairing.contact_b_company})` : '';
    const interest = pairing.mutual_interest || pairing.reason;

    const text = `Introduce ${nameA}${companyA} to ${nameB}${companyB} — ${interest}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(pairing.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for clipboard API not available
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(pairing.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-brand-charcoal">Introduction Pairings</h3>
          <p className="text-xs text-ui-tertiary mt-1">AI-suggested guest introductions</p>
        </div>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-terracotta rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} />
            {generating ? 'Generating...' : 'Generate Pairings'}
          </button>
        )}
      </div>

      {pairings.length === 0 ? (
        <div className="text-center py-8 bg-white border border-ui-border rounded-lg">
          <ArrowLeftRight size={28} className="mx-auto mb-3 text-ui-tertiary opacity-50" />
          <p className="text-sm text-ui-tertiary">No pairings yet. Click Generate Pairings to create AI-suggested introductions based on guest profiles.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pairings.map(pairing => {
            const pMeta = priorityLabels[pairing.priority] || priorityLabels[3];
            const isCopied = copiedId === pairing.id;
            return (
              <div
                key={pairing.id}
                className="bg-white border border-ui-border rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Person A */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-brand-charcoal truncate">
                      {pairing.contact_a_name}
                    </div>
                    {pairing.contact_a_company && (
                      <div className="text-xs text-ui-tertiary truncate">{pairing.contact_a_company}</div>
                    )}
                  </div>

                  {/* Connector */}
                  <div className="shrink-0 flex flex-col items-center pt-1">
                    <ArrowLeftRight size={16} className="text-brand-terracotta" />
                  </div>

                  {/* Person B */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-sm font-semibold text-brand-charcoal truncate">
                      {pairing.contact_b_name}
                    </div>
                    {pairing.contact_b_company && (
                      <div className="text-xs text-ui-tertiary truncate">{pairing.contact_b_company}</div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-ui-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ui-secondary">{pairing.reason}</p>
                      {pairing.mutual_interest && (
                        <p className="text-xs text-ui-tertiary mt-1">
                          <span className="font-semibold">Common ground:</span> {pairing.mutual_interest}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleFacilitate(pairing)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          isCopied
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-brand-cream text-brand-charcoal hover:bg-brand-terracotta/10 hover:text-brand-terracotta border border-ui-border'
                        }`}
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? 'Copied' : 'Facilitate'}
                      </button>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${pMeta.color}`}>
                        {pMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
