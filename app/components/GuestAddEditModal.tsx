'use client'

import { useEffect, useState } from 'react'
import { X, Save, Plus, Minus } from 'lucide-react'

interface GuestAddEditModalProps {
  campaignId: string
  guestId?: string | null  // null for add, string for edit
  onSuccess: () => void
  onCancel: () => void
}

type GuestFormData = {
  first_name: string
  last_name: string
  company: string
  title: string
  linkedin_url: string
  email: string
  phone: string
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'WAITLIST'
  priority: 'VIP' | 'HIGH' | 'NORMAL' | 'LOW'
  expected_plus_ones: number
  introduction_source: string
  host_notes: string
  tags: string
  internal_notes: string
}

export function GuestAddEditModal({ campaignId, guestId, onSuccess, onCancel }: GuestAddEditModalProps) {
  const [formData, setFormData] = useState<GuestFormData>({
    first_name: '',
    last_name: '',
    company: '',
    title: '',
    linkedin_url: '',
    email: '',
    phone: '',
    tier: 'TIER_2',
    priority: 'NORMAL',
    expected_plus_ones: 0,
    introduction_source: '',
    host_notes: '',
    tags: '',
    internal_notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing guest data if editing
  useEffect(() => {
    if (guestId) {
      fetchGuestData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestId])

  async function fetchGuestData() {
    try {
      const res = await fetch(`/api/invitations/${guestId}`)
      if (!res.ok) throw new Error('Failed to fetch guest data')

      const data = await res.json()
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        company: data.company || '',
        title: data.title || '',
        linkedin_url: data.linkedin_url || '',
        email: data.email || '',
        phone: data.phone || '',
        tier: data.tier || 'TIER_2',
        priority: data.priority || 'NORMAL',
        expected_plus_ones: data.expected_plus_ones || 0,
        introduction_source: data.introduction_source || '',
        host_notes: data.host_notes || '',
        tags: data.tags?.join(', ') || '',
        internal_notes: data.internal_notes || '',
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load guest data')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.first_name.trim()) {
      setError('First name is required')
      return
    }

    if (!formData.last_name.trim()) {
      setError('Last name is required')
      return
    }

    if (!formData.company.trim()) {
      setError('Company is required')
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setLoading(true)

      // Prepare submission data with tags as array
      const submitData = {
        ...formData,
        tags: formData.tags
          ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
          : [],
      }

      if (guestId) {
        // Update existing guest
        const res = await fetch(`/api/invitations/${guestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update guest')
        }
      } else {
        // Create new guest
        const res = await fetch(`/api/campaigns/${campaignId}/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to add guest')
        }
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-ui-border">
          <h2 className="text-xl font-semibold text-brand-charcoal tracking-tight">
            {guestId ? 'Edit Guest' : 'Add Guest'}
          </h2>
          <button
            onClick={onCancel}
            className="text-ui-tertiary hover:text-brand-charcoal transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="John"
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="Doe"
                required
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Company <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="Acme Corporation"
                required
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="CEO"
              />
            </div>

            {/* LinkedIn URL */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                LinkedIn Profile
              </label>
              <input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-ui-border pt-4">
              <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Event Context</h3>
            </div>

            {/* Tier */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Tier
              </label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as GuestFormData['tier'] })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
              >
                <option value="TIER_1">Tier 1 (First Wave)</option>
                <option value="TIER_2">Tier 2 (Second Wave)</option>
                <option value="TIER_3">Tier 3 (Third Wave)</option>
                <option value="WAITLIST">Waitlist</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as GuestFormData['priority'] })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
              >
                <option value="VIP">VIP</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Expected Plus Ones */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Expected +1s
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expected_plus_ones: Math.max(0, formData.expected_plus_ones - 1) })}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-ui-border rounded-lg text-brand-charcoal hover:border-brand-terracotta transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="text-lg font-semibold text-brand-charcoal min-w-[3rem] text-center">
                  {formData.expected_plus_ones}
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expected_plus_ones: formData.expected_plus_ones + 1 })}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-ui-border rounded-lg text-brand-charcoal hover:border-brand-terracotta transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-ui-border pt-4">
              <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Curation Intelligence</h3>
              <p className="text-xs text-ui-tertiary mb-4">Help your team understand why this guest matters</p>
            </div>

            {/* Introduction Source */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Introduced By
              </label>
              <input
                type="text"
                value={formData.introduction_source}
                onChange={(e) => setFormData({ ...formData, introduction_source: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="e.g., Sarah Chen (Partner)"
              />
            </div>

            {/* Host Notes */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Host Notes
              </label>
              <textarea
                value={formData.host_notes}
                onChange={(e) => setFormData({ ...formData, host_notes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="Why they matter for this event..."
                rows={3}
              />
              <p className="text-xs text-ui-tertiary mt-1">e.g., &quot;Key LP relationship. CEO of portfolio company ($50M ARR).&quot;</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="Portfolio CEO, Key LP, Board Member"
              />
              <p className="text-xs text-ui-tertiary mt-1">Separate multiple tags with commas</p>
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Internal Notes
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                placeholder="Operational notes (not shown to host)"
                rows={2}
              />
            </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white border border-ui-border rounded-lg text-ui-secondary hover:bg-brand-cream transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white rounded-lg transition-colors shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save size={16} />
                  {guestId ? 'Save Changes' : 'Add Guest'}
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
