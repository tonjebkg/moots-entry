'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

type Tab = 'password' | 'magic-link';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#6e6e7e]" size={32} />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const errorParam = searchParams.get('error');

  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === 'invalid_token' ? 'Invalid or expired link.' :
    errorParam === 'token_used' ? 'This link has already been used.' :
    errorParam === 'token_expired' ? 'This link has expired.' :
    ''
  );
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        return;
      }

      router.push(redirect);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send magic link');
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF9F7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">Moots</h1>
          <p className="text-sm text-[#6e6e7e] mt-2">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#e1e4e8] rounded-2xl p-8 shadow-sm">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[#f0f2f5] rounded-lg p-1">
            <button
              onClick={() => { setTab('password'); setError(''); setMagicLinkSent(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'password'
                  ? 'bg-white text-[#1C1C1E] shadow-sm'
                  : 'text-[#6e6e7e] hover:text-[#1C1C1E]'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => { setTab('magic-link'); setError(''); setMagicLinkSent(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'magic-link'
                  ? 'bg-white text-[#1C1C1E] shadow-sm'
                  : 'text-[#6e6e7e] hover:text-[#1C1C1E]'
              }`}
            >
              Magic Link
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {tab === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-[#e1e4e8] rounded-lg text-sm text-[#1C1C1E] placeholder-[#6e6e7e] focus:outline-none focus:border-[#2F4F3F] focus:ring-1 focus:ring-[#2F4F3F]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-[#1C1C1E]">Password</label>
                  <Link href="/reset-password" className="text-xs text-[#2F4F3F] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-[#e1e4e8] rounded-lg text-sm text-[#1C1C1E] placeholder-[#6e6e7e] focus:outline-none focus:border-[#2F4F3F] focus:ring-1 focus:ring-[#2F4F3F]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2F4F3F] hover:bg-[#3a6349] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                Sign In
              </button>
            </form>
          ) : magicLinkSent ? (
            <div className="text-center py-4">
              <Mail className="mx-auto mb-3 text-[#2F4F3F]" size={32} />
              <h3 className="text-lg font-semibold text-[#1C1C1E] mb-2">Check your email</h3>
              <p className="text-sm text-[#6e6e7e]">
                If an account exists for <strong>{email}</strong>, we sent a magic link to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-[#e1e4e8] rounded-lg text-sm text-[#1C1C1E] placeholder-[#6e6e7e] focus:outline-none focus:border-[#2F4F3F] focus:ring-1 focus:ring-[#2F4F3F]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2F4F3F] hover:bg-[#3a6349] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Send Magic Link
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#6e6e7e] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#2F4F3F] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
