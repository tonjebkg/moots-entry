'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface JoinInvitation {
  event_title: string;
  recipient_name: string;
  recipient_email: string;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params['join-token'] as string;

  const [invitation, setInvitation] = useState<JoinInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchInvitation() {
    try {
      setLoading(true);
      const res = await fetch(`/api/join/${token}/details`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Invalid or expired join link');
      }

      const data = await res.json();
      setInvitation(data.invitation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/join/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join event');
      }

      setRedirectUrl(data.redirect_url);
      setSubmitted(true);

      // Auto-redirect after 3 seconds
      if (data.redirect_url) {
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to the Event Room!
          </h1>
          <p className="text-gray-600 mb-6">
            You&apos;ve successfully joined <strong>{invitation?.event_title}</strong>
          </p>

          {redirectUrl && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm text-blue-800">
                Redirecting you to the app...
              </div>
              <a
                href={redirectUrl}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Open Moots App
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Join the Event Room</h1>
          <p className="text-purple-100">Connect with other attendees</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Welcome Message */}
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Hi <strong className="text-gray-900">{invitation?.recipient_name}</strong>,
            </p>
            <p className="text-gray-600 mb-4">
              You&apos;re confirmed for <strong className="text-gray-900">{invitation?.event_title}</strong>!
            </p>
            <p className="text-gray-600">
              Click below to join the event room where you can:
            </p>
          </div>

          {/* Features */}
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">See other attendees</div>
                  <div className="text-sm text-gray-600">Browse profiles and backgrounds</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Share your goals</div>
                  <div className="text-sm text-gray-600">Let others know what you&apos;re looking for</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Prepare for introductions</div>
                  <div className="text-sm text-gray-600">Plan meaningful connections</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Optional Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Introduction (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell other attendees a bit about yourself..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Email Pre-filled */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={invitation?.recipient_email || ''}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={submitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 font-semibold text-lg shadow-lg"
          >
            {submitting ? 'Joining...' : '🚀 Join Event Room'}
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-sm text-gray-600">
          Powered by <strong>Moots</strong>
        </div>
      </div>
    </div>
  );
}
