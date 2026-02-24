'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface InvitationDetails {
  event_title: string;
  event_date: string;
  event_location: string;
  recipient_name: string;
  recipient_email: string;
  expected_plus_ones: number;
}

export default function RsvpPage() {
  const params = useParams();
  const token = params['invitation-token'] as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [action, setAction] = useState<'ACCEPT' | 'DECLINE' | null>(null);
  const [message, setMessage] = useState('');
  const [plusOnes, setPlusOnes] = useState(0);

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  async function fetchInvitation() {
    try {
      setLoading(true);
      const res = await fetch(`/api/rsvp/${token}/details`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Invalid or expired invitation');
      }

      const data = await res.json();
      setInvitation(data.invitation);
      setPlusOnes(data.invitation.expected_plus_ones || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(selectedAction: 'ACCEPT' | 'DECLINE') {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/rsvp/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          message: message.trim() || undefined,
          plus_ones: selectedAction === 'ACCEPT' ? plusOnes : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit RSVP');
      }

      setAction(selectedAction);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-600">Loading invitation...</div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">
            {action === 'ACCEPT' ? '🎉' : '💌'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {action === 'ACCEPT' ? 'Thank You!' : 'Thank You for Letting Us Know'}
          </h1>
          <p className="text-gray-600 mb-6">
            {action === 'ACCEPT'
              ? 'Your RSVP has been confirmed. The host will send you access to the event room shortly.'
              : 'We appreciate you letting us know. Hope to see you at a future event!'}
          </p>
          {action === 'ACCEPT' && plusOnes > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              You indicated <strong>{plusOnes} plus-one{plusOnes === 1 ? '' : 's'}</strong>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">You&apos;re Invited!</h1>
          <p className="text-blue-100">Please respond to your invitation</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Guest Info */}
          <div className="mb-6">
            <p className="text-gray-600 mb-1">Hi <strong className="text-gray-900">{invitation?.recipient_name}</strong>,</p>
            <p className="text-gray-600">You&apos;re invited to:</p>
          </div>

          {/* Event Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {invitation?.event_title}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">📅 Date & Time</div>
                <div className="text-gray-900">{invitation?.event_date}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">📍 Location</div>
                <div className="text-gray-900">{invitation?.event_location}</div>
              </div>
            </div>
          </div>

          {/* Plus Ones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many guests will you bring? (including yourself)
            </label>
            <select
              value={plusOnes}
              onChange={(e) => setPlusOnes(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[0, 1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num === 0 ? 'Just me' : num === 1 ? 'Me + 1 guest' : `Me + ${num} guests`}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any dietary restrictions, questions, or notes for the host..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleSubmit('ACCEPT')}
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold text-lg"
            >
              {submitting ? 'Submitting...' : '✓ Accept Invitation'}
            </button>
            <button
              onClick={() => handleSubmit('DECLINE')}
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-400 font-semibold text-lg"
            >
              {submitting ? 'Submitting...' : '✗ Decline'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-sm text-gray-600">
          Powered by <strong>Moots</strong>
        </div>
      </div>
    </div>
  );
}
