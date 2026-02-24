'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          organization_name: orgName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          const errors: Record<string, string> = {};
          data.details.forEach((d: { field: string; message: string }) => {
            errors[d.field] = d.message;
          });
          setFieldErrors(errors);
        }
        setError(data.error || 'Signup failed');
        return;
      }

      router.push('/dashboard');
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
          <p className="text-sm text-[#6e6e7e] mt-2">Create your host dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#e1e4e8] rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1E] mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={16} />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-[#e1e4e8] rounded-lg text-sm text-[#1C1C1E] placeholder-[#6e6e7e] focus:outline-none focus:border-[#2F4F3F] focus:ring-1 focus:ring-[#2F4F3F]"
                />
              </div>
              {fieldErrors.full_name && <p className="mt-1 text-xs text-red-600">{fieldErrors.full_name}</p>}
            </div>

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
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1C1E] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 12 characters"
                  required
                  minLength={12}
                  className="w-full pl-10 pr-3 py-2.5 border border-[#e1e4e8] rounded-lg text-sm text-[#1C1C1E] placeholder-[#6e6e7e] focus:outline-none focus:border-[#2F4F3F] focus:ring-1 focus:ring-[#2F4F3F]"
                />
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
              <p className="mt-1 text-xs text-[#6e6e7e]">
                Must include uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1C1E] mb-1.5">Organization</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={16} />
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="Your company or team name"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-[#e1e4e8] rounded-lg text-sm text-[#1C1C1E] placeholder-[#6e6e7e] focus:outline-none focus:border-[#2F4F3F] focus:ring-1 focus:ring-[#2F4F3F]"
                />
              </div>
              {fieldErrors.organization_name && <p className="mt-1 text-xs text-red-600">{fieldErrors.organization_name}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2F4F3F] hover:bg-[#3a6349] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Create Account
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#6e6e7e] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#2F4F3F] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
