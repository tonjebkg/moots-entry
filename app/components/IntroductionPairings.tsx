'use client';

import { Sparkles, ArrowLeftRight } from 'lucide-react';

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
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[#1a1a2e]">Introduction Pairings</h3>
          <p className="text-xs text-[#6e6e7e] mt-1">AI-suggested guest introductions</p>
        </div>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} />
            {generating ? 'Generating...' : 'Generate Pairings'}
          </button>
        )}
      </div>

      {pairings.length === 0 ? (
        <div className="text-center py-8 bg-white border border-[#e1e4e8] rounded-lg">
          <ArrowLeftRight size={28} className="mx-auto mb-3 text-[#6e6e7e] opacity-50" />
          <p className="text-sm text-[#6e6e7e]">No pairings yet. Generate AI suggestions above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pairings.map(pairing => {
            const pMeta = priorityLabels[pairing.priority] || priorityLabels[3];
            return (
              <div
                key={pairing.id}
                className="bg-white border border-[#e1e4e8] rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Person A */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1a1a2e] truncate">
                      {pairing.contact_a_name}
                    </div>
                    {pairing.contact_a_company && (
                      <div className="text-xs text-[#6e6e7e] truncate">{pairing.contact_a_company}</div>
                    )}
                  </div>

                  {/* Connector */}
                  <div className="shrink-0 flex flex-col items-center pt-1">
                    <ArrowLeftRight size={16} className="text-[#0f3460]" />
                  </div>

                  {/* Person B */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-sm font-semibold text-[#1a1a2e] truncate">
                      {pairing.contact_b_name}
                    </div>
                    {pairing.contact_b_company && (
                      <div className="text-xs text-[#6e6e7e] truncate">{pairing.contact_b_company}</div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#e1e4e8]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#4a4a5e]">{pairing.reason}</p>
                      {pairing.mutual_interest && (
                        <p className="text-xs text-[#6e6e7e] mt-1">
                          <span className="font-semibold">Common ground:</span> {pairing.mutual_interest}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded border ${pMeta.color}`}>
                      {pMeta.label}
                    </span>
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
