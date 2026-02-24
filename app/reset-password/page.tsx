'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-ui-tertiary" size={32} />
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (token) {
    return <SetNewPassword token={token} />;
  }
  return <RequestReset />;
}

function RequestReset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send reset link');
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-charcoal tracking-tight">Moots</h1>
          <p className="text-sm text-ui-tertiary mt-2">Reset your password</p>
        </div>

        <div className="bg-white border border-ui-border rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <Mail className="mx-auto mb-3 text-brand-forest" size={32} />
              <h3 className="text-lg font-semibold text-brand-charcoal mb-2">Check your email</h3>
              <p className="text-sm text-ui-tertiary">
                If an account exists for <strong>{email}</strong>, we sent a password reset link.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Send Reset Link
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-ui-tertiary mt-6">
          <Link href="/login" className="text-brand-forest font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function SetNewPassword({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-charcoal tracking-tight">Moots</h1>
          <p className="text-sm text-ui-tertiary mt-2">Set a new password</p>
        </div>

        <div className="bg-white border border-ui-border rounded-2xl p-8 shadow-sm">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={32} />
              <h3 className="text-lg font-semibold text-brand-charcoal mb-2">Password reset</h3>
              <p className="text-sm text-ui-tertiary mb-4">
                Your password has been updated. You can now sign in.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <ArrowRight size={16} />
                Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1.5">New Password</label>
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      minLength={12}
                      className="w-full pl-10 pr-3 py-2.5 border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Reset Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
