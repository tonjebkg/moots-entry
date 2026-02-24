'use client';

import { useState } from 'react';
import { X, Send, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface SendRsvpModalProps {
  campaignId: string;
  selectedIds?: string[];
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3';
  onSuccess: () => void;
  onCancel: () => void;
}

export function SendRsvpModal({
  campaignId,
  selectedIds,
  tier,
  onSuccess,
  onCancel,
}: SendRsvpModalProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const count = selectedIds ? selectedIds.length : 'all';
  const description = tier
    ? `Send RSVP invitations to all guests in ${tier.replace('_', ' ')}`
    : `Send RSVP invitations to ${count} selected guest${count === 1 ? '' : 's'}`;

  async function handleSend() {
    try {
      setSending(true);
      setError(null);

      const body: any = {};
      if (selectedIds) {
        body.invitation_ids = selectedIds;
      } else if (tier) {
        body.tier = tier;
      }

      const res = await fetch(`/api/campaigns/${campaignId}/send-rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send RSVP invitations');
      }

      setResult({ sent: data.sent, failed: data.failed });

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-ui-border">
          <h2 className="text-xl font-semibold text-brand-charcoal tracking-tight">
            Send RSVP Invitations
          </h2>
          <button
            onClick={onCancel}
            disabled={sending}
            className="text-ui-tertiary hover:text-brand-charcoal transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">

          {!result ? (
            <>
              <p className="text-ui-secondary mb-6 leading-relaxed">{description}</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="bg-blue-50/50 border border-brand-terracotta/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="text-brand-terracotta shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-ui-secondary">
                    <p className="font-semibold text-brand-charcoal mb-2">What happens next?</p>
                    <ul className="list-disc list-inside space-y-1.5 text-ui-secondary">
                      <li>Guests will receive an RSVP email with a unique link</li>
                      <li>They can accept or decline the invitation</li>
                      <li>Status will be updated in the guest pipeline</li>
                      <li>After accepting, you can send them join links for app access</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white rounded-lg transition-colors shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send size={16} />
                      Send Invitations
                    </>
                  )}
                </button>
                <button
                  onClick={onCancel}
                  disabled={sending}
                  className="px-4 py-2 bg-white border border-ui-border rounded-lg text-ui-secondary hover:bg-brand-cream transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-emerald-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-brand-charcoal">
                      Invitations Sent!
                    </h3>
                    <p className="text-ui-secondary text-sm">
                      Successfully sent {result.sent} RSVP invitation{result.sent === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {result.failed > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                    <span>
                      {result.failed} invitation{result.failed === 1 ? '' : 's'} failed to send
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={onSuccess}
                className="w-full px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white rounded-lg transition-colors shadow-sm font-semibold"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
