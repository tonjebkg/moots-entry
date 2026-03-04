'use client';

import { useEffect, useState } from 'react';
import { Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SecurityPage() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setHasPassword(data.has_password);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleChangePassword() {
    setMsg(null);

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMsg({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorText = data.details?.length
          ? data.details.join('. ')
          : data.error || 'Failed to change password';
        setMsg({ type: 'error', text: errorText });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-ui-tertiary" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-brand-charcoal tracking-tight mb-1">
          Password & Security
        </h1>
        <p className="text-sm text-ui-secondary">
          Update your password and manage security settings.
        </p>
      </div>

      {hasPassword ? (
        <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ui-border/50 flex items-center gap-2">
            <Lock size={16} className="text-ui-tertiary" />
            <h2 className="text-base font-semibold text-brand-charcoal">Change Password</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
              <p className="text-xs text-ui-tertiary mt-1">
                Minimum 12 characters with uppercase, lowercase, numbers, and special characters.
              </p>
            </div>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>

            {msg && <StatusMessage type={msg.type} text={msg.text} onDismiss={() => setMsg(null)} />}

            <div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-charcoal rounded-lg hover:bg-brand-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5">
            <p className="text-sm text-ui-secondary">
              Your account uses SSO authentication. Password management is handled by your identity provider.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function StatusMessage({ type, text, onDismiss }: { type: 'success' | 'error'; text: string; onDismiss: () => void }) {
  const isError = type === 'error';
  return (
    <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${
      isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
    }`}>
      <span className="flex items-center gap-2">
        {isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
        {text}
      </span>
      <button onClick={onDismiss} className={`ml-3 text-xs font-medium shrink-0 ${isError ? 'text-red-400 hover:text-red-700' : 'text-green-400 hover:text-green-700'}`}>
        Dismiss
      </button>
    </div>
  );
}
