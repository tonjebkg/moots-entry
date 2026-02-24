'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface InviteDetails {
  email: string;
  workspace_name: string;
  role: string;
  inviter_name?: string;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/auth/invite/verify?token=${token}`);
        if (!res.ok) {
          setInviteError('This invitation link is invalid or has expired.');
          return;
        }
        const data = await res.json();
        setInvite(data);
      } catch {
        setInviteError('Failed to load invitation details.');
      } finally {
        setLoadingInvite(false);
      }
    }

    fetchInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          full_name: fullName,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loadingInvite) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-ui-tertiary" size={32} />
      </main>
    );
  }

  if (inviteError || !invite) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white border border-ui-border rounded-2xl p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-charcoal mb-2">Invalid Invitation</h2>
            <p className="text-sm text-ui-tertiary mb-6">{inviteError}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-charcoal tracking-tight">Moots</h1>
          <p className="text-sm text-ui-tertiary mt-2">Join {invite.workspace_name}</p>
        </div>

        <div className="bg-white border border-ui-border rounded-2xl p-8 shadow-sm">
          {/* Invite info */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-6">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
            <div className="text-sm">
              <p className="text-emerald-800 font-medium">
                You&apos;ve been invited as {invite.role.replace('_', ' ').toLowerCase()}
              </p>
              <p className="text-emerald-600">{invite.email}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 12 characters"
                  required
                  minLength={12}
                  className="w-full pl-10 pr-3 py-2.5 border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest"
                />
              </div>
              <p className="mt-1 text-xs text-ui-tertiary">
                Must include uppercase, lowercase, number, and special character
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Accept & Join
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ui-tertiary mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-forest font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
