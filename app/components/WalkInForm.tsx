'use client'

import { useState, useEffect } from 'react'
import { X, UserPlus, Search } from 'lucide-react'
import { AvatarInitials } from './ui/AvatarInitials'

interface WorkspaceMember {
  user_id: string
  user_full_name: string
  user_email: string
  role: string
}

interface WalkInFormProps {
  eventId: string
  onClose: () => void
  onSuccess: () => void
  tables?: { number: number; seats: number }[]
  seatingEnabled?: boolean
  workspaceMembers?: WorkspaceMember[]
}

interface GuestSearchResult {
  invitation_id: string
  first_name: string
  last_name: string
  company: string | null
  contact_id: string | null
}

export function WalkInForm({ eventId, onClose, onSuccess, tables, seatingEnabled, workspaceMembers }: WalkInFormProps) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    company: '',
    title: '',
    phone: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // New optional fields
  const [attachToGuest, setAttachToGuest] = useState<string | null>(null) // contact_id of guest to attach to
  const [attachGuestName, setAttachGuestName] = useState<string>('')
  const [guestSearchQuery, setGuestSearchQuery] = useState('')
  const [guestSearchResults, setGuestSearchResults] = useState<GuestSearchResult[]>([])
  const [guestSearching, setGuestSearching] = useState(false)
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)
  const [tableAssignment, setTableAssignment] = useState<number | null>(null)
  const [assignedMember, setAssignedMember] = useState<string | null>(null) // user_id

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
          full_name: form.full_name,
          email: form.email || null,
          company: form.company || null,
          title: form.title || null,
          phone: form.phone || null,
          notes: form.notes || null,
          attached_to_contact_id: attachToGuest || undefined,
          table_assignment: tableAssignment || undefined,
          assigned_team_member: assignedMember ? workspaceMembers?.find(m => m.user_id === assignedMember)?.user_full_name : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to register walk-in')
      }

      // If table assignment, also fire seating API
      if (tableAssignment) {
        try {
          const walkinData = await res.json?.() || {}
          if (walkinData.contact_id) {
            await fetch(`/api/events/${eventId}/seating`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contact_id: walkinData.contact_id, table_number: tableAssignment }),
            })
          }
        } catch {
          // seating assignment is non-critical
        }
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-terracotta" />
            <h3 className="text-lg font-semibold text-brand-charcoal">Walk-in Registration</h3>
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

          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="jane@company.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                placeholder="VP Engineering"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="+1 555 000 0000"
            />
          </div>

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

          {/* ─── New Optional Fields ─────────────────────────────── */}

          <div className="border-t border-ui-border pt-4 space-y-4">
            {/* Attach to guest */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Attach to Guest (Plus-one)</label>
              {attachToGuest ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-brand-cream border border-ui-border rounded-lg">
                  <AvatarInitials name={attachGuestName} size={20} />
                  <span className="text-sm font-medium text-brand-charcoal flex-1">{attachGuestName}</span>
                  <button
                    type="button"
                    onClick={() => { setAttachToGuest(null); setAttachGuestName(''); setGuestSearchQuery('') }}
                    className="p-0.5 hover:bg-white rounded transition-colors"
                  >
                    <X size={14} className="text-ui-tertiary" />
                  </button>
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

            {/* Assign to Team Member */}
            {workspaceMembers && workspaceMembers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">Assign to Team Member</label>
                <select
                  value={assignedMember ?? ''}
                  onChange={(e) => setAssignedMember(e.target.value || null)}
                  className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                >
                  <option value="">No assignment</option>
                  {workspaceMembers.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              disabled={submitting || !form.full_name}
              className="px-6 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Walk-in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
