'use client';

import { useState } from 'react';
import { Check, X, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface ActionConfirmationProps {
  action: {
    type: string;       // 'check_in' | 'move_guest' | 'add_note' | 'add_to_pool'
    params: Record<string, string | number | boolean>;
    description: string;
  };
  eventId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

type ActionStatus = 'pending' | 'loading' | 'success' | 'error';

/**
 * Renders inside the chat when the AI proposes an action.
 * Shows the action description with Confirm/Cancel buttons.
 * Executes the appropriate API call on confirm.
 */
export function ActionConfirmation({ action, eventId, onConfirm, onCancel }: ActionConfirmationProps) {
  const [status, setStatus] = useState<ActionStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  async function handleConfirm() {
    setStatus('loading');

    try {
      let url = '';
      let method = 'POST';
      let body: Record<string, unknown> = {};

      switch (action.type) {
        case 'check_in':
          if (!eventId) throw new Error('Event ID required for check-in');
          url = `/api/events/${eventId}/checkin`;
          body = { contact_id: action.params.contactId, guest_name: action.params.guestName };
          break;

        case 'add_note':
          url = `/api/contacts/${action.params.contactId}/notes`;
          body = { note: action.params.note };
          break;

        case 'move_guest':
          if (!eventId) throw new Error('Event ID required for move');
          url = `/api/events/${eventId}/seating/assign`;
          method = 'PATCH';
          body = {
            contact_id: action.params.contactId,
            table_id: action.params.tableId,
          };
          break;

        case 'add_to_pool':
          if (!eventId) throw new Error('Event ID required');
          url = `/api/events/${eventId}/invitations`;
          body = {
            contact_id: action.params.contactId,
            tier: action.params.tier || 'C',
          };
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || `Failed with status ${res.status}`);
      }

      setStatus('success');
      onConfirm();
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message || 'Action failed');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 my-2">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Done: {action.description}</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 my-2">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Failed: {errorMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 my-2">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-purple-600" />
        <span className="text-sm font-semibold text-purple-800">Moots Intelligence suggests:</span>
      </div>
      <p className="text-sm text-brand-charcoal mb-3">{action.description}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleConfirm}
          disabled={status === 'loading'}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-terracotta text-white text-sm font-semibold rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-60"
        >
          {status === 'loading' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {status === 'loading' ? 'Running...' : 'Confirm'}
        </button>
        <button
          onClick={onCancel}
          disabled={status === 'loading'}
          className="flex items-center gap-1.5 px-4 py-2 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors disabled:opacity-60"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </div>
  );
}
