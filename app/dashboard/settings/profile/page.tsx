'use client';

import { useEffect, useState } from 'react';
import { User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AvatarInitials } from '@/app/components/ui/AvatarInitials';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  has_password: boolean;
  created_at: string;
}

export default function PersonalInfoPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data: UserProfile = await res.json();
          setProfile(data);
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setCompany(data.company || '');
          setTitle(data.title || '');
          setPhone(data.phone || '');
          setLinkedinUrl(data.linkedin_url || '');
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!firstName.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          company: company.trim() || null,
          title: title.trim() || null,
          phone: phone.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => prev ? { ...prev, ...updated } : prev);
        setMsg({ type: 'success', text: 'Profile updated' });
      } else {
        const data = await res.json();
        setMsg({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    firstName.trim() !== (profile?.first_name || '') ||
    lastName.trim() !== (profile?.last_name || '') ||
    (company.trim() || null) !== (profile?.company || null) ||
    (title.trim() || null) !== (profile?.title || null) ||
    (phone.trim() || null) !== (profile?.phone || null) ||
    (linkedinUrl.trim() || null) !== (profile?.linkedin_url || null);

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
          Personal Info
        </h1>
        <p className="text-sm text-ui-secondary">
          Manage your name, contact details, and professional information.
        </p>
      </div>

      <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ui-border/50 flex items-center gap-2">
          <User size={16} className="text-ui-tertiary" />
          <h2 className="text-base font-semibold text-brand-charcoal">Profile Details</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            {profile?.full_name ? (
              <AvatarInitials name={profile.full_name} size={56} />
            ) : (
              <div className="w-14 h-14 rounded-full bg-ui-border" />
            )}
            <div>
              <p className="text-sm font-medium text-brand-charcoal">{profile?.full_name}</p>
              <p className="text-xs text-ui-tertiary">{profile?.email}</p>
            </div>
          </div>

          {/* First Name + Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
          </div>

          {/* Company + Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Head of Events"
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
          </div>

          {/* Phone + LinkedIn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">LinkedIn URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourname"
                className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="max-w-2xl">
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              readOnly
              className="w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg bg-brand-cream/50 text-ui-tertiary cursor-not-allowed"
            />
            <p className="text-xs text-ui-tertiary mt-1">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          {msg && <StatusMessage type={msg.type} text={msg.text} onDismiss={() => setMsg(null)} />}

          <div>
            <button
              onClick={handleSave}
              disabled={saving || !firstName.trim() || !hasChanges}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-terracotta rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>
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
