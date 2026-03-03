'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Unplug, CheckCircle2, Clock, Send } from 'lucide-react';

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

const PLATFORM_CONFIG = {
  telegram: {
    name: 'Telegram',
    color: '#0088CC',
    bgColor: 'bg-[#0088CC]/10',
    textColor: 'text-[#0088CC]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
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
    color: '#25D366',
    bgColor: 'bg-[#25D366]/10',
    textColor: 'text-[#25D366]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
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

export default function MessagingSettingsPage() {
  const [channels, setChannels] = useState<MessagingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pairing state per platform
  const [pairingCodes, setPairingCodes] = useState<Record<string, string>>({
    telegram: '',
    whatsapp: '',
  });
  const [verifying, setVerifying] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/messaging');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load channels');
      }
    } catch {
      setError('Failed to load messaging channels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  function getChannelForType(type: string): MessagingChannel | undefined {
    return channels.find((c) => c.channel_type === type);
  }

  async function handleVerify(channelType: string) {
    const code = pairingCodes[channelType];
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit pairing code');
      return;
    }

    try {
      setVerifying(channelType);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/settings/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      setSuccess(`${PLATFORM_CONFIG[channelType as keyof typeof PLATFORM_CONFIG].name} connected successfully!`);
      setPairingCodes((prev) => ({ ...prev, [channelType]: '' }));
      await fetchChannels();
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(null);
    }
  }

  async function handleDisconnect(channelId: string, channelType: string) {
    const platformName = PLATFORM_CONFIG[channelType as keyof typeof PLATFORM_CONFIG]?.name || channelType;
    if (!confirm(`Disconnect ${platformName}? You will need to pair again to use messaging.`)) {
      return;
    }

    try {
      setDisconnecting(channelId);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/settings/messaging/${channelId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to disconnect');
        return;
      }

      setSuccess(`${platformName} disconnected`);
      await fetchChannels();
    } catch {
      setError('Failed to disconnect channel');
    } finally {
      setDisconnecting(null);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading messaging settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-brand-charcoal tracking-tight mb-2">
          Messaging Integrations
        </h1>
        <p className="text-sm text-ui-secondary">
          Connect your messaging accounts to chat with Moots Intelligence from your phone.
          Ask about events, guests, campaigns, and more — all from Telegram or WhatsApp.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-red-700 font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-start justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-3 text-green-400 hover:text-green-700 font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Platform cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(Object.keys(PLATFORM_CONFIG) as Array<keyof typeof PLATFORM_CONFIG>).map((platform) => {
          const cfg = PLATFORM_CONFIG[platform];
          const channel = getChannelForType(platform);
          const isConnected = !!channel;

          return (
            <div
              key={platform}
              className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="p-5 border-b border-ui-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bgColor} ${cfg.textColor}`}
                    >
                      {cfg.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-brand-charcoal">{cfg.name}</h3>
                      <span
                        className={`text-xs font-medium ${
                          isConnected ? 'text-green-600' : 'text-ui-tertiary'
                        }`}
                      >
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>

                  {isConnected && (
                    <button
                      onClick={() => handleDisconnect(channel.id, platform)}
                      disabled={disconnecting === channel.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Unplug size={12} />
                      {disconnecting === channel.id ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="p-5">
                {isConnected ? (
                  /* Connected state */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-ui-tertiary mb-0.5">Display Name</p>
                        <p className="text-sm font-medium text-brand-charcoal">
                          {channel.display_name || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ui-tertiary mb-0.5">
                          {platform === 'telegram' ? 'Telegram ID' : 'Phone Number'}
                        </p>
                        <p className="text-sm font-medium text-brand-charcoal font-mono">
                          {channel.channel_user_id}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-ui-tertiary mb-0.5">Paired On</p>
                        <p className="text-sm text-brand-charcoal flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-green-500" />
                          {formatDate(channel.paired_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ui-tertiary mb-0.5">Last Message</p>
                        <p className="text-sm text-brand-charcoal flex items-center gap-1">
                          <Clock size={12} className="text-ui-tertiary" />
                          {formatDate(channel.last_message_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-brand-cream/50 rounded-lg">
                      <p className="text-xs text-ui-secondary flex items-center gap-1.5">
                        <MessageSquare size={12} />
                        Send a message to your {cfg.name} bot to start chatting with Moots Intelligence
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Not connected state — pairing flow */
                  <div className="space-y-4">
                    {/* Setup steps */}
                    <div>
                      <p className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">
                        How to Connect
                      </p>
                      <ol className="space-y-1.5">
                        {cfg.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-ui-secondary">
                            <span
                              className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${cfg.bgColor} ${cfg.textColor}`}
                            >
                              {i + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Pairing code input */}
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-brand-charcoal mb-1.5">
                        Pairing Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={pairingCodes[platform]}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setPairingCodes((prev) => ({ ...prev, [platform]: val }));
                          }}
                          placeholder="000000"
                          className="flex-1 px-3 py-2.5 text-sm font-mono tracking-[0.3em] text-center border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta"
                        />
                        <button
                          onClick={() => handleVerify(platform)}
                          disabled={
                            pairingCodes[platform].length !== 6 || verifying === platform
                          }
                          className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-brand-terracotta rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={14} />
                          {verifying === platform ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works section */}
      <section className="bg-white border border-ui-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold font-display text-brand-charcoal mb-3">
          How Messaging Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-8 h-8 rounded-lg bg-brand-terracotta/10 flex items-center justify-center mb-2">
              <span className="text-sm font-bold text-brand-terracotta">1</span>
            </div>
            <h3 className="text-sm font-semibold text-brand-charcoal mb-1">Pair Your Account</h3>
            <p className="text-xs text-ui-secondary leading-relaxed">
              Get a pairing code from the Telegram bot or WhatsApp, then enter it here to link
              your messaging account to your Moots workspace.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-brand-terracotta/10 flex items-center justify-center mb-2">
              <span className="text-sm font-bold text-brand-terracotta">2</span>
            </div>
            <h3 className="text-sm font-semibold text-brand-charcoal mb-1">Ask Anything</h3>
            <p className="text-xs text-ui-secondary leading-relaxed">
              Once paired, send natural language questions about your events, guests, campaigns,
              and more. Moots Intelligence responds with real-time data.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-brand-terracotta/10 flex items-center justify-center mb-2">
              <span className="text-sm font-bold text-brand-terracotta">3</span>
            </div>
            <h3 className="text-sm font-semibold text-brand-charcoal mb-1">Stay in the Loop</h3>
            <p className="text-xs text-ui-secondary leading-relaxed">
              Check guest statuses, get event briefs, and manage your events — all from your
              phone without opening the dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
