'use client';

import { useState } from 'react';
import { Sparkles, ArrowLeftRight, Copy, Check, Plus, X } from 'lucide-react';

interface Pairing {
  id: string;
  contact_a_id?: string;
  contact_b_id?: string;
  contact_a_name?: string;
  contact_a_company?: string;
  contact_a_title?: string;
  contact_b_name?: string;
  contact_b_company?: string;
  contact_b_title?: string;
  reason: string;
  mutual_interest: string | null;
  priority: number;
}

interface GuestOption {
  contact_id: string;
  full_name: string;
  company: string | null;
}

interface IntroductionPairingsProps {
  pairings: Pairing[];
  onGenerate?: () => void;
  generating?: boolean;
  onGuestClick?: (contactId: string) => void;
  availableGuests?: GuestOption[];
  onCreateManual?: (contactAId: string, contactBId: string, reason: string) => Promise<void>;
}

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Must Meet', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  2: { label: 'High', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  3: { label: 'Nice to Have', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function PersonLabel({
  name,
  title,
  company,
  contactId,
  onGuestClick,
}: {
  name?: string;
  title?: string;
  company?: string;
  contactId?: string;
  onGuestClick?: (contactId: string) => void;
}) {
  const subtitle = [title, company].filter(Boolean).join(', ');

  return (
    <div className="min-w-0">
      {onGuestClick && contactId ? (
        <button
          onClick={(e) => { e.stopPropagation(); onGuestClick(contactId); }}
          className="text-sm font-semibold text-brand-charcoal hover:text-brand-terracotta hover:underline transition-colors text-left truncate block"
        >
          {name || 'Unknown'}
        </button>
      ) : (
        <div className="text-sm font-semibold text-brand-charcoal truncate">
          {name || 'Unknown'}
        </div>
      )}
      {subtitle && (
        <div className="text-xs text-ui-tertiary truncate">{subtitle}</div>
      )}
    </div>
  );
}

export function IntroductionPairings({ pairings, onGenerate, generating, onGuestClick, availableGuests, onCreateManual }: IntroductionPairingsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualGuestA, setManualGuestA] = useState('');
  const [manualGuestB, setManualGuestB] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreateManual() {
    if (!manualGuestA || !manualGuestB || !manualReason.trim() || !onCreateManual) return;
    setCreating(true);
    try {
      await onCreateManual(manualGuestA, manualGuestB, manualReason.trim());
      setShowManualForm(false);
      setManualGuestA('');
      setManualGuestB('');
      setManualReason('');
    } catch {
      // Error handled by parent
    } finally {
      setCreating(false);
    }
  }

  async function handleCopyIntro(pairing: Pairing) {
    const nameA = pairing.contact_a_name || 'Guest A';
    const nameB = pairing.contact_b_name || 'Guest B';
    const titleA = pairing.contact_a_title ? `, ${pairing.contact_a_title}` : '';
    const titleB = pairing.contact_b_title ? `, ${pairing.contact_b_title}` : '';
    const companyA = pairing.contact_a_company ? ` at ${pairing.contact_a_company}` : '';
    const companyB = pairing.contact_b_company ? ` at ${pairing.contact_b_company}` : '';
    const interest = pairing.mutual_interest || pairing.reason;

    const text = `Introduce ${nameA}${titleA}${companyA} to ${nameB}${titleB}${companyB} — ${interest}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(pairing.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
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
        <div className="flex items-center gap-2">
          {onCreateManual && availableGuests && availableGuests.length >= 2 && (
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-ui-border rounded-lg text-ui-secondary hover:bg-brand-cream transition-colors"
            >
              {showManualForm ? <X size={14} /> : <Plus size={14} />}
              {showManualForm ? 'Cancel' : 'Create Pairing'}
            </button>
          )}
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
      </div>

      {/* Manual pairing form */}
      {showManualForm && availableGuests && (
        <div className="bg-white border border-ui-border rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ui-tertiary mb-1">Guest A</label>
              <select
                value={manualGuestA}
                onChange={(e) => setManualGuestA(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta"
              >
                <option value="">Select a guest...</option>
                {availableGuests
                  .filter(g => g.contact_id !== manualGuestB)
                  .map(g => (
                    <option key={g.contact_id} value={g.contact_id}>
                      {g.full_name}{g.company ? ` — ${g.company}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ui-tertiary mb-1">Guest B</label>
              <select
                value={manualGuestB}
                onChange={(e) => setManualGuestB(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta"
              >
                <option value="">Select a guest...</option>
                {availableGuests
                  .filter(g => g.contact_id !== manualGuestA)
                  .map(g => (
                    <option key={g.contact_id} value={g.contact_id}>
                      {g.full_name}{g.company ? ` — ${g.company}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ui-tertiary mb-1">Reason for introduction</label>
            <input
              type="text"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="e.g. Both interested in AI infrastructure"
              className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta"
            />
          </div>
          <button
            onClick={handleCreateManual}
            disabled={creating || !manualGuestA || !manualGuestB || !manualReason.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-forest rounded-lg hover:bg-brand-forest/90 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            {creating ? 'Creating...' : 'Add Pairing'}
          </button>
        </div>
      )}

      {pairings.length === 0 ? (
        <div className="text-center py-8 bg-white border border-ui-border rounded-lg">
          <ArrowLeftRight size={28} className="mx-auto mb-3 text-brand-terracotta opacity-60" />
          <p className="text-sm text-ui-secondary max-w-md mx-auto">Once guests are confirmed, I&apos;ll identify who should meet based on shared interests, complementary backgrounds, and your event objectives.</p>
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
                {/* Names side by side, close together */}
                <div className="flex items-center gap-3 mb-3">
                  <PersonLabel
                    name={pairing.contact_a_name}
                    title={pairing.contact_a_title}
                    company={pairing.contact_a_company}
                    contactId={pairing.contact_a_id}
                    onGuestClick={onGuestClick}
                  />
                  <ArrowLeftRight size={16} className="text-brand-terracotta shrink-0" />
                  <PersonLabel
                    name={pairing.contact_b_name}
                    title={pairing.contact_b_title}
                    company={pairing.contact_b_company}
                    contactId={pairing.contact_b_id}
                    onGuestClick={onGuestClick}
                  />
                  <div className="ml-auto shrink-0">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${pMeta.color}`}>
                      {pMeta.label}
                    </span>
                  </div>
                </div>

                {/* Reasoning + actions */}
                <div className="pt-3 border-t border-ui-border">
                  <p className="text-sm text-ui-secondary">{pairing.reason}</p>
                  {pairing.mutual_interest && (
                    <p className="text-xs text-ui-tertiary mt-1">
                      <span className="font-semibold">Common ground:</span> {pairing.mutual_interest}
                    </p>
                  )}
                  <div className="mt-2">
                    <button
                      onClick={() => handleCopyIntro(pairing)}
                      title="Copy introduction note to clipboard — use this to plan the introduction"
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-brand-cream text-brand-charcoal hover:bg-brand-terracotta/10 hover:text-brand-terracotta border border-ui-border'
                      }`}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      {isCopied ? 'Copied!' : 'Copy Intro Note'}
                    </button>
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
