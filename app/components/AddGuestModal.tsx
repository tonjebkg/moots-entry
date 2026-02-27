'use client'

import { useState } from 'react'
import { X, Loader2, UserPlus, Linkedin } from 'lucide-react'

interface AddGuestModalProps {
  onClose: () => void
  onSuccess: () => void
}

function normalizeLinkedInUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  // Bare username — wrap in full URL
  return `https://linkedin.com/in/${trimmed.replace(/^\/+/, '')}`
}

export function AddGuestModal({ onClose, onSuccess }: AddGuestModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedinInput, setLinkedinInput] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required')
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!company.trim()) {
      setError('Company is required')
      return
    }

    setSubmitting(true)
    setError(null)

    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const linkedinUrl = normalizeLinkedInUrl(linkedinInput)

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          emails: [{ email: email.trim(), type: 'work' }],
          title: title.trim() || undefined,
          company: company.trim(),
          linkedin_url: linkedinUrl || undefined,
          internal_notes: notes.trim() || undefined,
          source: 'MANUAL',
          tags: [],
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        if (res.status === 409) {
          setError(`Duplicate contact found: ${data.duplicate?.full_name || 'unknown'}`)
        } else {
          setError(data.error || 'Failed to create contact')
        }
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-card shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border">
          <h3 className="text-lg font-semibold font-display text-brand-charcoal">Add Guest</h3>
          <button onClick={onClose} className="p-1 hover:bg-brand-cream rounded-lg">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* First Name + Last Name — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sarah"
                className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta placeholder-ui-tertiary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Chen"
                className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta placeholder-ui-tertiary"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta placeholder-ui-tertiary"
            />
          </div>

          {/* LinkedIn URL */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">LinkedIn URL</label>
            <div className="relative">
              <Linkedin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0077b5]" />
              <input
                type="text"
                value={linkedinInput}
                onChange={(e) => setLinkedinInput(e.target.value)}
                placeholder="linkedin.com/in/sarahchen or sarahchen"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta placeholder-ui-tertiary"
              />
            </div>
            {linkedinInput.trim() && (
              <p className="text-[11px] text-ui-tertiary mt-1">
                Profile data will be used to enrich this contact
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Managing Director"
              className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta placeholder-ui-tertiary"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Company *</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Meridian Capital"
              className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta placeholder-ui-tertiary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Note (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes about this contact..."
              className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
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
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus size={14} />
                Add Guest
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
