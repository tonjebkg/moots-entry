'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, ExternalLink, Copy, Check, Trash2, Shield, Loader2,
  QrCode, Clock, RefreshCw
} from 'lucide-react'

interface CheckinToken {
  id: string
  token: string
  pin_code: string | null
  expires_at: string
  created_at: string
  created_by_name: string | null
  url?: string
}

interface DoorCheckinLinkProps {
  eventId: string
  onClose: () => void
}

export function DoorCheckinLink({ eventId, onClose }: DoorCheckinLinkProps) {
  const [tokens, setTokens] = useState<CheckinToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [expiryHours, setExpiryHours] = useState(24)

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrTokenId, setQrTokenId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const apiBase = `/api/events/${eventId}/checkin-tokens`

  // Fetch existing tokens
  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch(apiBase)
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens || [])
      }
    } catch {
      setError('Failed to load tokens')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  // Generate QR code as data URL using canvas
  async function generateQrDataUrl(url: string) {
    try {
      // Dynamically import qrcode (browser version)
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: '#1C1C1E', light: '#FFFFFF' },
      })
      return dataUrl
    } catch {
      return null
    }
  }

  // Create new token
  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin_code: pinEnabled && pinCode.length >= 4 ? pinCode : undefined,
          expires_in_hours: expiryHours,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create token')
      }
      const newToken = await res.json()
      setTokens(prev => [newToken, ...prev])
      setPinCode('')
      setPinEnabled(false)

      // Generate QR for the new token
      const doorUrl = newToken.url || `${window.location.origin}/door/${newToken.token}`
      const dataUrl = await generateQrDataUrl(doorUrl)
      setQrDataUrl(dataUrl)
      setQrTokenId(newToken.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Revoke token
  async function handleRevoke(tokenId: string) {
    setRevoking(tokenId)
    try {
      const res = await fetch(`${apiBase}/${tokenId}`, { method: 'DELETE' })
      if (res.ok) {
        setTokens(prev => prev.filter(t => t.id !== tokenId))
        if (qrTokenId === tokenId) {
          setQrDataUrl(null)
          setQrTokenId(null)
        }
      }
    } catch {
      setError('Failed to revoke token')
    } finally {
      setRevoking(null)
    }
  }

  // Copy URL
  function handleCopy(tokenRecord: CheckinToken) {
    const url = tokenRecord.url || `${window.location.origin}/door/${tokenRecord.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(tokenRecord.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Show QR for a token
  async function handleShowQr(tokenRecord: CheckinToken) {
    if (qrTokenId === tokenRecord.id) {
      setQrDataUrl(null)
      setQrTokenId(null)
      return
    }
    const url = tokenRecord.url || `${window.location.origin}/door/${tokenRecord.token}`
    const dataUrl = await generateQrDataUrl(url)
    setQrDataUrl(dataUrl)
    setQrTokenId(tokenRecord.id)
  }

  function formatExpiry(expiresAt: string) {
    const remaining = new Date(expiresAt).getTime() - Date.now()
    if (remaining <= 0) return 'Expired'
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    if (hours < 1) {
      const mins = Math.floor(remaining / (1000 * 60))
      return `${mins}m left`
    }
    if (hours < 24) return `${hours}h left`
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h left`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-brand-terracotta" />
            <h3 className="text-lg font-semibold text-brand-charcoal">Staff Check-in Link</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-brand-cream rounded-lg transition-colors">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="text-sm text-ui-secondary">
            Create a shareable link for door staff to check in guests — no login required. The link opens a standalone check-in page with QR scanner, guest list, and walk-in registration.
          </p>

          {/* Create form */}
          <div className="bg-brand-cream rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-brand-charcoal mb-1">Link Expiry</label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta"
                >
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours (default)</option>
                  <option value={48}>2 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pin-toggle"
                checked={pinEnabled}
                onChange={(e) => setPinEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="pin-toggle" className="text-sm text-brand-charcoal flex items-center gap-1.5">
                <Shield size={14} className="text-ui-tertiary" />
                Require PIN to access
              </label>
            </div>

            {pinEnabled && (
              <div>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="4–8 digit PIN"
                  className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm tracking-wider text-center focus:outline-none focus:border-brand-terracotta"
                />
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={creating || (pinEnabled && pinCode.length < 4)}
              className="w-full py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
              {creating ? 'Creating...' : 'Generate Link'}
            </button>
          </div>

          {/* QR Code display */}
          {qrDataUrl && qrTokenId && (
            <div className="flex justify-center">
              <div className="bg-white border border-ui-border rounded-xl p-4 text-center">
                <img src={qrDataUrl} alt="QR Code for check-in link" className="w-48 h-48 mx-auto" />
                <p className="text-xs text-ui-tertiary mt-2">Scan with phone to open Door View</p>
              </div>
            </div>
          )}

          {/* Existing tokens */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-ui-tertiary animate-spin" />
            </div>
          ) : tokens.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-brand-charcoal">Active Links</h4>
              {tokens.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 bg-white border border-ui-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-brand-charcoal truncate">
                      /door/{t.token.slice(0, 12)}...
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ui-tertiary mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatExpiry(t.expires_at)}
                      </span>
                      {t.pin_code && (
                        <span className="flex items-center gap-1">
                          <Shield size={11} />
                          PIN
                        </span>
                      )}
                      {t.created_by_name && (
                        <span>by {t.created_by_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleShowQr(t)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        qrTokenId === t.id ? 'bg-brand-terracotta/10 text-brand-terracotta' : 'hover:bg-brand-cream text-ui-tertiary'
                      }`}
                      title="Show QR"
                    >
                      <QrCode size={16} />
                    </button>
                    <button
                      onClick={() => handleCopy(t)}
                      className="p-1.5 hover:bg-brand-cream rounded-lg text-ui-tertiary transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === t.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => handleRevoke(t.id)}
                      disabled={revoking === t.id}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-ui-tertiary hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Revoke"
                    >
                      {revoking === t.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-ui-tertiary py-4">
              No active check-in links. Create one above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
