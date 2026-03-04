'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, Lock, MessageSquare, Link2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AvatarInitials } from '@/app/components/ui/AvatarInitials';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  email_verified: boolean;
  has_password: boolean;
  created_at: string;
}

interface MessagingChannel {
  id: string;
  channel_type: 'telegram' | 'whatsapp';
  channel_user_id: string;
  display_name: string | null;
  is_verified: boolean;
  paired_at: string | null;
  last_message_at: string | null;
  created_at: string;
}

// ─── Messaging Platform Config ───────────────────────────────────────────────

const PLATFORM_CONFIG = {
  telegram: {
    name: 'Telegram',
    bgColor: 'bg-[#0088CC]/10',
    textColor: 'text-[#0088CC]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    steps: [
      'Open Telegram and search for the Moots Intelligence bot',
      'Send the /pair command to the bot',
      'Copy the 6-digit code you receive',
      'Enter the code below and click Verify',
    ],
  },
  whatsapp: {
    name: 'WhatsApp',
    bgColor: 'bg-[#25D366]/10',
    textColor: 'text-[#25D366]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
    steps: [
      'Message the Moots Intelligence WhatsApp number',
      'Send "pair" as your first message',
      'Copy the 6-digit code you receive',
      'Enter the code below and click Verify',
    ],
  },
} as const;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Personal info form
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Messaging
  const [channels, setChannels] = useState<MessagingChannel[]>([]);
  const [pairingCodes, setPairingCodes] = useState<Record<string, string>>({ telegram: '', whatsapp: '' });
  const [verifying, setVerifying] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [messagingMsg, setMessagingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load profile
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setName(data.full_name || '');
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load messaging channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/messaging');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!name.trim()) return;
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => prev ? { ...prev, ...updated } : prev);
        setProfileMsg({ type: 'success', text: 'Profile updated' });
      } else {
        const data = await res.json();
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
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
        setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorText = data.details?.length
          ? data.details.join('. ')
          : data.error || 'Failed to change password';
        setPasswordMsg({ type: 'error', text: errorText });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleVerifyChannel(channelType: string) {
    const code = pairingCodes[channelType];
    if (!code || code.length !== 6) {
      setMessagingMsg({ type: 'error', text: 'Please enter a valid 6-digit pairing code' });
      return;
    }
    setVerifying(channelType);
    setMessagingMsg(null);
    try {
      const res = await fetch('/api/settings/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessagingMsg({ type: 'error', text: data.error || 'Verification failed' });
        return;
      }
      setMessagingMsg({ type: 'success', text: `${PLATFORM_CONFIG[channelType as keyof typeof PLATFORM_CONFIG].name} connected!` });
      setPairingCodes(prev => ({ ...prev, [channelType]: '' }));
      await fetchChannels();
    } catch {
      setMessagingMsg({ type: 'error', text: 'Verification failed' });
    } finally {
      setVerifying(null);
    }
  }

  async function handleDisconnectChannel(channelId: string, channelType: string) {
    const platformName = PLATFORM_CONFIG[channelType as keyof typeof PLATFORM_CONFIG]?.name || channelType;
    if (!confirm(`Disconnect ${platformName}? You will need to pair again.`)) return;

    setDisconnecting(channelId);
    setMessagingMsg(null);
    try {
      const res = await fetch(`/api/settings/messaging/${channelId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setMessagingMsg({ type: 'error', text: data.error || 'Failed to disconnect' });
        return;
      }
      setMessagingMsg({ type: 'success', text: `${platformName} disconnected` });
      await fetchChannels();
    } catch {
      setMessagingMsg({ type: 'error', text: 'Failed to disconnect channel' });
    } finally {
      setDisconnecting(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

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
          My Profile
        </h1>
        <p className="text-sm text-ui-secondary">
          Manage your personal information, password, and connected accounts.
        </p>
      </div>

      {/* ── Personal Information ─────────────────────────────────────────── */}
      <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ui-border/50 flex items-center gap-2">
          <User size={16} className="text-ui-tertiary" />
          <h2 className="text-base font-semibold text-brand-charcoal">Personal Information</h2>
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full max-w-md px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              readOnly
              className="w-full max-w-md px-3 py-2.5 text-sm border border-ui-border rounded-lg bg-brand-cream/50 text-ui-tertiary cursor-not-allowed"
            />
            <p className="text-xs text-ui-tertiary mt-1">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          {profileMsg && (
            <StatusMessage type={profileMsg.type} text={profileMsg.text} onDismiss={() => setProfileMsg(null)} />
          )}

          <div>
            <button
              onClick={handleSaveProfile}
              disabled={saving || name.trim() === profile?.full_name}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-terracotta rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Password ────────────────────────────────────────────────────── */}
      {profile?.has_password && (
        <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ui-border/50 flex items-center gap-2">
            <Lock size={16} className="text-ui-tertiary" />
            <h2 className="text-base font-semibold text-brand-charcoal">Change Password</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full max-w-md px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full max-w-md px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
              <p className="text-xs text-ui-tertiary mt-1">
                Minimum 12 characters with uppercase, lowercase, numbers, and special characters.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full max-w-md px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
              />
            </div>

            {passwordMsg && (
              <StatusMessage type={passwordMsg.type} text={passwordMsg.text} onDismiss={() => setPasswordMsg(null)} />
            )}

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
      )}

      {/* ── Messaging ───────────────────────────────────────────────────── */}
      <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ui-border/50 flex items-center gap-2">
          <MessageSquare size={16} className="text-ui-tertiary" />
          <h2 className="text-base font-semibold text-brand-charcoal">Messaging</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-ui-secondary mb-5">
            Connect Telegram or WhatsApp to chat with Moots Intelligence from your phone.
          </p>

          {messagingMsg && (
            <div className="mb-5">
              <StatusMessage type={messagingMsg.type} text={messagingMsg.text} onDismiss={() => setMessagingMsg(null)} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(Object.keys(PLATFORM_CONFIG) as Array<keyof typeof PLATFORM_CONFIG>).map(platform => {
              const cfg = PLATFORM_CONFIG[platform];
              const channel = channels.find(c => c.channel_type === platform);
              const isConnected = !!channel;

              return (
                <div key={platform} className="border border-ui-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-ui-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.bgColor} ${cfg.textColor}`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brand-charcoal">{cfg.name}</p>
                        <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-ui-tertiary'}`}>
                          {isConnected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                    {isConnected && (
                      <button
                        onClick={() => handleDisconnectChannel(channel.id, platform)}
                        disabled={disconnecting === channel.id}
                        className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {disconnecting === channel.id ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {isConnected ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-ui-tertiary">Display Name</p>
                            <p className="font-medium text-brand-charcoal">{channel.display_name || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-ui-tertiary">{platform === 'telegram' ? 'Telegram ID' : 'Phone'}</p>
                            <p className="font-medium text-brand-charcoal font-mono text-xs">{channel.channel_user_id}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ol className="space-y-1">
                          {cfg.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-ui-secondary">
                              <span className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${cfg.bgColor} ${cfg.textColor}`}>
                                {i + 1}
                              </span>
                              <span className="pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={pairingCodes[platform]}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setPairingCodes(prev => ({ ...prev, [platform]: val }));
                            }}
                            placeholder="000000"
                            className="flex-1 px-3 py-2 text-sm font-mono tracking-[0.3em] text-center border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
                          />
                          <button
                            onClick={() => handleVerifyChannel(platform)}
                            disabled={pairingCodes[platform].length !== 6 || verifying === platform}
                            className="px-4 py-2 text-sm font-semibold text-white bg-brand-terracotta rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {verifying === platform ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Connected Accounts ───────────────────────────────────────────── */}
      <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ui-border/50 flex items-center gap-2">
          <Link2 size={16} className="text-ui-tertiary" />
          <h2 className="text-base font-semibold text-brand-charcoal">Connected Accounts</h2>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 border border-ui-border rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0077B5]">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-charcoal">LinkedIn</p>
                <p className="text-xs text-ui-tertiary">Coming soon</p>
              </div>
              <span className="text-xs font-medium text-ui-tertiary bg-brand-cream px-2 py-1 rounded-full">Soon</span>
            </div>
            <div className="flex items-center gap-3 p-4 border border-ui-border rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-charcoal">Gmail</p>
                <p className="text-xs text-ui-tertiary">Coming soon</p>
              </div>
              <span className="text-xs font-medium text-ui-tertiary bg-brand-cream px-2 py-1 rounded-full">Soon</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Status Message Component ────────────────────────────────────────────────

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
