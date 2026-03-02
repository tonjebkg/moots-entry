'use client'

import { useState, useEffect } from 'react'
import { X, UserPlus, Search, Linkedin } from 'lucide-react'
import { AvatarInitials } from './ui/AvatarInitials'

interface WalkInFormProps {
  eventId: string
  onClose: () => void
  onSuccess: (checkin: { contact_id: string; full_name: string }) => void
  tables?: { number: number; seats: number }[]
  seatingEnabled?: boolean
  attachedToGuest?: { contactId: string; name: string }
}

interface GuestSearchResult {
  invitation_id: string
  first_name: string
  last_name: string
  company: string | null
  contact_id: string | null
}

export function WalkInForm({ eventId, onClose, onSuccess, tables, seatingEnabled, attachedToGuest }: WalkInFormProps) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    linkedin_url: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Guest-of (plus-one) state
  const [attachToGuest, setAttachToGuest] = useState<string | null>(attachedToGuest?.contactId || null)
  const [attachGuestName, setAttachGuestName] = useState<string>(attachedToGuest?.name || '')
  const [guestSearchQuery, setGuestSearchQuery] = useState('')
  const [guestSearchResults, setGuestSearchResults] = useState<GuestSearchResult[]>([])
  const [guestSearching, setGuestSearching] = useState(false)
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)
  const [tableAssignment, setTableAssignment] = useState<number | null>(null)

  // Guest search for attach-to-guest
  useEffect(() => {
    if (!guestSearchQuery.trim()) {
      setGuestSearchResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setGuestSearching(true)
      try {
        const res = await fetch(`/api/events/${eventId}/checkin/search?q=${encodeURIComponent(guestSearchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setGuestSearchResults(data.results || [])
        }
      } catch {
        // ignore search errors
      } finally {
        setGuestSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [guestSearchQuery, eventId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/events/${eventId}/checkin/walk-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          linkedin_url: form.linkedin_url || null,
          attached_to_contact_id: attachToGuest || undefined,
          notes: form.notes || null,
          table_assignment: tableAssignment || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to register walk-in')
      }

      const checkinData = await res.json()

      // If table assignment, also fire seating API
      if (tableAssignment && checkinData.contact_id) {
        fetch(`/api/events/${eventId}/seating`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id: checkinData.contact_id, table_number: tableAssignment }),
        }).catch(() => {}) // seating assignment is non-critical
      }

      onSuccess({
        contact_id: checkinData.contact_id,
        full_name: `${form.first_name} ${form.last_name}`,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isLocked = !!attachedToGuest

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-terracotta" />
            <h3 className="text-lg font-semibold text-brand-charcoal">
              {attachedToGuest ? `Plus One for ${attachedToGuest.name}` : 'Walk-in Registration'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-brand-cream rounded-lg transition-colors">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* First Name + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">First Name *</label>
              <input
                type="text"
                required
                autoFocus
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                placeholder="Smith"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="jane@company.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="+1 555 000 0000"
            />
          </div>

          {/* Company with N/A skip */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-brand-charcoal">Company *</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, company: 'N/A' })}
                className="text-xs text-ui-tertiary hover:text-brand-terracotta transition-colors"
              >
                Skip (N/A)
              </button>
            </div>
            <input
              type="text"
              required
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="Acme Inc"
            />
          </div>

          {/* LinkedIn URL */}
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">
              <span className="flex items-center gap-1.5">
                <Linkedin size={13} className="text-[#0A66C2]" />
                LinkedIn URL
              </span>
            </label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="https://linkedin.com/in/janesmith"
            />
            <p className="text-[11px] text-ui-tertiary mt-1">We&apos;ll use this to complete their profile</p>
          </div>

          <div className="border-t border-ui-border pt-4 space-y-4">
            {/* Guest of (plus-one) */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Guest of</label>
              {attachToGuest ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-brand-cream border border-ui-border rounded-lg">
                  <AvatarInitials name={attachGuestName} size={20} />
                  <span className="text-sm font-medium text-brand-charcoal flex-1">{attachGuestName}</span>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => { setAttachToGuest(null); setAttachGuestName(''); setGuestSearchQuery('') }}
                      className="p-0.5 hover:bg-white rounded transition-colors"
                    >
                      <X size={14} className="text-ui-tertiary" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary" />
                  <input
                    type="text"
                    value={guestSearchQuery}
                    onChange={(e) => { setGuestSearchQuery(e.target.value); setShowGuestDropdown(true) }}
                    onFocus={() => setShowGuestDropdown(true)}
                    className="w-full pl-9 pr-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                    placeholder="Search by name to link as plus-one..."
                  />
                  {showGuestDropdown && guestSearchQuery.trim() && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowGuestDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1 max-h-40 overflow-y-auto">
                        {guestSearching ? (
                          <div className="px-3 py-2 text-[13px] text-ui-tertiary">Searching...</div>
                        ) : guestSearchResults.length === 0 ? (
                          <div className="px-3 py-2 text-[13px] text-ui-tertiary">No guests found</div>
                        ) : (
                          guestSearchResults.map(g => (
                            <button
                              key={g.invitation_id}
                              type="button"
                              onClick={() => {
                                setAttachToGuest(g.contact_id)
                                setAttachGuestName(`${g.first_name} ${g.last_name}`)
                                setShowGuestDropdown(false)
                                setGuestSearchQuery('')
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                            >
                              <AvatarInitials name={`${g.first_name} ${g.last_name}`} size={20} />
                              <div className="text-left">
                                <div className="font-medium">{g.first_name} {g.last_name}</div>
                                {g.company && <div className="text-ui-tertiary text-[11px]">{g.company}</div>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Table Assignment */}
            {seatingEnabled && tables && tables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">Table Assignment</label>
                <select
                  value={tableAssignment ?? ''}
                  onChange={(e) => setTableAssignment(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                >
                  <option value="">No table assignment</option>
                  {tables.map(t => (
                    <option key={t.number} value={t.number}>
                      Table {t.number} ({t.seats} seats)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none"
                placeholder="How they heard about the event..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ui-tertiary hover:text-brand-charcoal transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.first_name || !form.last_name || !form.email || !form.phone || !form.company}
              className="px-6 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add & Check In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
