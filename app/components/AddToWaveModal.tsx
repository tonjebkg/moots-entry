'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Plus, Loader2 } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: string
  total_considering: number
  total_invited: number
  total_accepted: number
}

interface AddToWaveModalProps {
  eventId: string
  contactIds: string[]
  onClose: () => void
  onSuccess: () => void
}

const TIERS = [
  { value: 'TIER_1', label: 'Tier 1' },
  { value: 'TIER_2', label: 'Tier 2' },
  { value: 'TIER_3', label: 'Tier 3' },
  { value: 'WAITLIST', label: 'Waitlist' },
]

const PRIORITIES = [
  { value: 'VIP', label: 'VIP' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
]

export function AddToWaveModal({ eventId, contactIds, onClose, onSuccess }: AddToWaveModalProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [tier, setTier] = useState('TIER_2')
  const [priority, setPriority] = useState('NORMAL')
  const [notes, setNotes] = useState('')

  // Progress for bulk
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] })

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch(`/api/events/${eventId}/campaigns`)
        if (res.ok) {
          const data = await res.json()
          setCampaigns(data.campaigns || [])
          if (data.campaigns?.length > 0) {
            setSelectedCampaignId(data.campaigns[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch campaigns:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCampaigns()
  }, [eventId])

  async function handleSubmit() {
    if (!selectedCampaignId) {
      setError('Please select a campaign')
      return
    }

    setSubmitting(true)
    setError(null)
    setProgress(0)
    setResults({ success: 0, failed: 0, errors: [] })

    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < contactIds.length; i++) {
      try {
        const res = await fetch(`/api/events/${eventId}/add-to-campaign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: contactIds[i],
            campaign_id: selectedCampaignId,
            tier,
            priority,
            internal_notes: notes || undefined,
          }),
        })

        if (res.ok) {
          success++
        } else {
          const data = await res.json()
          if (res.status === 409) {
            // Already in campaign — count as success
            success++
          } else {
            failed++
            errors.push(data.error || 'Unknown error')
          }
        }
      } catch {
        failed++
        errors.push('Network error')
      }

      setProgress(i + 1)
      setResults({ success, failed, errors })
    }

    if (failed === 0) {
      onSuccess()
    } else {
      setSubmitting(false)
    }
  }

  const isBulk = contactIds.length > 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-card shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold font-display text-brand-charcoal">
            Add to Invitation Wave
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-brand-cream rounded-lg">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact count */}
          <p className="text-sm text-ui-secondary">
            {isBulk
              ? `Adding ${contactIds.length} contacts to an invitation campaign.`
              : 'Adding 1 contact to an invitation campaign.'}
          </p>

          {/* Campaign selector */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ui-tertiary">
              <Loader2 size={14} className="animate-spin" />
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-brand-cream border border-ui-border rounded-lg p-4 text-center">
              <p className="text-sm text-ui-secondary mb-2">No campaigns found yet.</p>
              <Link
                href={`/dashboard/${eventId}/campaigns`}
                className="text-sm font-semibold text-brand-terracotta hover:underline"
                onClick={onClose}
              >
                Create your first wave →
              </Link>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Campaign</label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.total_invited || 0} invited)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tier selector */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Tier</label>
            <div className="flex gap-2">
              {TIERS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTier(t.value)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    tier === t.value
                      ? 'bg-brand-terracotta text-white border-brand-terracotta'
                      : 'bg-white text-ui-secondary border-ui-border hover:bg-brand-cream'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Internal Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes visible only to your team..."
              className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none"
            />
          </div>

          {/* Progress bar for bulk */}
          {submitting && isBulk && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-ui-tertiary">
                <span>Adding contacts...</span>
                <span>{progress}/{contactIds.length}</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-terracotta rounded-full transition-all"
                  style={{ width: `${(progress / contactIds.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Results (for bulk with failures) */}
          {results.failed > 0 && !submitting && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              {results.success} added, {results.failed} failed.
              {results.errors.length > 0 && (
                <ul className="mt-1 list-disc list-inside text-xs">
                  {results.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ui-border">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || campaigns.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={14} />
                {isBulk ? `Add ${contactIds.length} to Wave` : 'Add to Wave'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
