'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Mail, Phone, Building2, Briefcase, Linkedin, Globe, Sparkles, Edit3, Save, MapPin, Clock, CheckCircle, FileText, StickyNote } from 'lucide-react'
import { EnrichmentStatusBadge } from './EnrichmentStatusBadge'
import { TagEditor } from './TagEditor'
import { formatUSDate, formatUSDateTime } from '@/lib/datetime'

interface ContactDetail {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  emails: { email: string; type?: string; primary?: boolean }[]
  phones: { phone: string; type?: string }[]
  company: string | null
  title: string | null
  role_seniority: string | null
  industry: string | null
  linkedin_url: string | null
  twitter_url: string | null
  address: string | null
  enrichment_status: string
  enrichment_data: Record<string, unknown>
  ai_summary: string | null
  tags: string[]
  internal_notes: string | null
  source: string
  created_at: string
  updated_at: string
  event_history?: {
    event_id: number
    event_title: string
    event_date: string | null
    relevance_score: number | null
    score_rationale: string | null
    scored_at: string | null
    checkin_status: string | null
    checked_in_at: string | null
    assigned_to_name: string | null
    follow_up_status: string | null
    event_notes: { id: string; note_text: string; author_name: string | null; created_at: string }[]
  }[]
  scores?: {
    id: string
    event_id: number
    event_title: string
    relevance_score: number
    score_rationale: string | null
    scored_at: string
  }[]
}

interface ContactDetailPanelProps {
  contactId: string
  onClose: () => void
  onUpdate?: () => void
  onEnrich?: (contactId: string) => void
}

export function ContactDetailPanel({ contactId, onClose, onUpdate, onEnrich }: ContactDetailPanelProps) {
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit state — all fields
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editIndustry, setEditIndustry] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    fetchContact()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId])

  async function fetchContact() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`)
      if (res.ok) {
        const data = await res.json()
        setContact(data)
        populateEditFields(data)
      }
    } catch (err) {
      console.error('Failed to fetch contact:', err)
    } finally {
      setLoading(false)
    }
  }

  function populateEditFields(c: ContactDetail) {
    setEditFirstName(c.first_name || '')
    setEditLastName(c.last_name || '')
    setEditEmail(c.emails?.[0]?.email || '')
    setEditPhone(c.phones?.[0]?.phone || '')
    setEditCompany(c.company || '')
    setEditTitle(c.title || '')
    setEditIndustry(c.industry || '')
    setEditLinkedin(c.linkedin_url || '')
    setEditAddress(c.address || '')
    setEditTags(c.tags || [])
    setEditNotes(c.internal_notes || '')
  }

  async function handleSave() {
    if (!contact) return
    setSaving(true)
    try {
      const fullName = [editFirstName, editLastName].filter(Boolean).join(' ') || contact.full_name

      const payload: Record<string, unknown> = {
        full_name: fullName,
        first_name: editFirstName || null,
        last_name: editLastName || null,
        company: editCompany || null,
        title: editTitle || null,
        industry: editIndustry || null,
        address: editAddress || null,
        tags: editTags,
        internal_notes: editNotes || null,
      }

      // Only set emails if changed
      if (editEmail && editEmail !== (contact.emails?.[0]?.email || '')) {
        payload.emails = [{ email: editEmail, type: 'work', primary: true }]
      }

      // Only set phones if changed
      if (editPhone && editPhone !== (contact.phones?.[0]?.phone || '')) {
        payload.phones = [{ phone: editPhone, type: 'work' }]
      } else if (!editPhone && contact.phones?.length) {
        payload.phones = []
      }

      // Only set linkedin_url if it's a valid URL or empty
      if (editLinkedin) {
        // Add https if missing
        const url = editLinkedin.startsWith('http') ? editLinkedin : `https://${editLinkedin}`
        payload.linkedin_url = url
      } else {
        payload.linkedin_url = null
      }

      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await fetchContact()
        setIsEditing(false)
        onUpdate?.()
      } else {
        const err = await res.json()
        console.error('Save failed:', err)
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  function getScoreColor(score: number) {
    if (score >= 70) return 'bg-emerald-100 text-emerald-700'
    if (score >= 40) return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-ui-tertiary'
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    CHECKED_IN: { label: 'Checked In', color: 'text-emerald-700 bg-emerald-50' },
    WALK_IN: { label: 'Walk-in', color: 'text-orange-700 bg-orange-50' },
    ACCEPTED: { label: 'Confirmed', color: 'text-blue-700 bg-blue-50' },
    DECLINED: { label: 'Declined', color: 'text-red-700 bg-red-50' },
    NO_SHOW: { label: 'No Show', color: 'text-gray-600 bg-gray-100' },
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl z-50 overflow-y-auto border-l border-ui-border">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-ui-border p-6 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-brand-charcoal">Contact Profile</h2>
            {contact && <p className="text-sm text-ui-tertiary">{contact.full_name}</p>}
          </div>
          <button onClick={onClose} className="text-ui-tertiary hover:text-brand-charcoal">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-ui-tertiary">Loading...</div>
        ) : contact ? (
          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="text-center">
              {contact.photo_url ? (
                <Image src={contact.photo_url} alt={contact.full_name} width={80} height={80} className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-ui-border object-cover" unoptimized />
              ) : (
                <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-brand-terracotta/80 to-brand-forest flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{contact.full_name.charAt(0)}</span>
                </div>
              )}
              <h3 className="text-xl font-semibold font-display text-brand-charcoal">{contact.full_name}</h3>
              {contact.title && contact.company && (
                <p className="text-sm text-ui-secondary mt-1">{contact.title} @ {contact.company}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onEnrich?.(contact.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Sparkles size={14} />
                Enrich
              </button>
              <button
                onClick={() => {
                  if (!isEditing) populateEditFields(contact)
                  setIsEditing(!isEditing)
                }}
                className="flex items-center gap-2 px-3 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream"
              >
                <Edit3 size={14} />
                Edit
              </button>
            </div>

            {isEditing ? (
              /* ─── Edit Mode ─── */
              <div className="space-y-5">
                {/* Name fields */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Name</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-ui-tertiary mb-1 block">First Name</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-ui-tertiary mb-1 block">Last Name</label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Contact Info</h4>
                  <div>
                    <label className="text-xs text-ui-tertiary mb-1 block">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-ui-tertiary shrink-0" />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ui-tertiary mb-1 block">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-ui-tertiary shrink-0" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ui-tertiary mb-1 block">LinkedIn</label>
                    <div className="flex items-center gap-2">
                      <Linkedin size={14} className="text-ui-tertiary shrink-0" />
                      <input
                        type="text"
                        value={editLinkedin}
                        onChange={(e) => setEditLinkedin(e.target.value)}
                        placeholder="linkedin.com/in/name"
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ui-tertiary mb-1 block">Address</label>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-ui-tertiary shrink-0" />
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="City, State/Country"
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Professional</h4>
                  <div>
                    <label className="text-xs text-ui-tertiary mb-1 block">Company</label>
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-ui-tertiary shrink-0" />
                      <input
                        type="text"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ui-tertiary mb-1 block">Title</label>
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} className="text-ui-tertiary shrink-0" />
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ui-tertiary mb-1 block">Industry</label>
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-ui-tertiary shrink-0" />
                      <input
                        type="text"
                        value={editIndustry}
                        onChange={(e) => setEditIndustry(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Tags</h4>
                  <TagEditor tags={editTags} onChange={setEditTags} />
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Internal Notes</h4>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    placeholder="Add a note about this contact..."
                    className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                  />
                </div>

                {/* Save/Cancel */}
                <div className="flex gap-2 pt-4 border-t border-ui-border">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2.5 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              /* ─── View Mode ─── */
              <>
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Contact Info</h4>
                  {contact.emails?.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-ui-secondary">
                      <Mail size={14} className="text-ui-tertiary" />
                      <span>{e.email}</span>
                      {e.type && <span className="text-xs text-ui-tertiary">({e.type})</span>}
                    </div>
                  ))}
                  {contact.phones?.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-ui-secondary">
                      <Phone size={14} className="text-ui-tertiary" />
                      <span>{p.phone}</span>
                    </div>
                  ))}
                  {contact.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin size={14} className="text-ui-tertiary" />
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-terracotta hover:underline">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {contact.address && (
                    <div className="flex items-center gap-2 text-sm text-ui-secondary">
                      <MapPin size={14} className="text-ui-tertiary" />
                      <span>{contact.address}</span>
                    </div>
                  )}
                  {!contact.emails?.length && !contact.phones?.length && !contact.linkedin_url && !contact.address && (
                    <p className="text-sm text-ui-tertiary">No contact info — click Edit to add</p>
                  )}
                </div>

                {/* Professional */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Professional</h4>
                  {contact.company && (
                    <div className="flex items-center gap-2 text-sm text-ui-secondary">
                      <Building2 size={14} className="text-ui-tertiary" />
                      <span>{contact.company}</span>
                    </div>
                  )}
                  {contact.title && (
                    <div className="flex items-center gap-2 text-sm text-ui-secondary">
                      <Briefcase size={14} className="text-ui-tertiary" />
                      <span>{contact.title}</span>
                    </div>
                  )}
                  {contact.industry && (
                    <div className="flex items-center gap-2 text-sm text-ui-secondary">
                      <Globe size={14} className="text-ui-tertiary" />
                      <span>{contact.industry}</span>
                    </div>
                  )}
                </div>

                {/* Enrichment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Enrichment</h4>
                    <EnrichmentStatusBadge status={contact.enrichment_status} />
                  </div>
                  {contact.ai_summary && (
                    <div className="bg-brand-cream rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-ui-tertiary mb-2">
                        <Sparkles size={12} />
                        AI Summary
                      </div>
                      <p className="text-sm text-ui-secondary leading-relaxed">{contact.ai_summary}</p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags?.length > 0 ? contact.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-brand-cream text-ui-secondary text-xs rounded-full">
                        {tag}
                      </span>
                    )) : (
                      <span className="text-sm text-ui-tertiary">No tags</span>
                    )}
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Internal Notes</h4>
                  {contact.internal_notes ? (
                    <p className="text-sm text-ui-secondary leading-relaxed">{contact.internal_notes}</p>
                  ) : (
                    <button
                      onClick={() => {
                        populateEditFields(contact)
                        setIsEditing(true)
                      }}
                      className="text-sm text-ui-tertiary hover:text-brand-terracotta cursor-pointer"
                    >
                      Add a note...
                    </button>
                  )}
                </div>

                {/* Event History */}
                {contact.event_history && contact.event_history.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Event History</h4>
                    {contact.event_history.map(ev => (
                      <div key={ev.event_id} className="bg-brand-cream rounded-lg p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-brand-charcoal">{ev.event_title}</div>
                            {ev.event_date && (
                              <div className="text-xs text-ui-tertiary">{formatUSDate(new Date(ev.event_date))}</div>
                            )}
                          </div>
                          {ev.relevance_score !== null && (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getScoreColor(ev.relevance_score)}`}>
                              {ev.relevance_score}
                            </div>
                          )}
                        </div>

                        {/* Status row */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {ev.checkin_status && (
                            <span className={`px-2 py-0.5 rounded font-medium ${STATUS_LABELS[ev.checkin_status]?.color || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[ev.checkin_status]?.label || ev.checkin_status}
                            </span>
                          )}
                          {ev.checked_in_at && (
                            <span className="flex items-center gap-1 text-ui-tertiary">
                              <Clock size={11} />
                              {new Date(ev.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                          {ev.assigned_to_name && (
                            <span className="text-ui-tertiary">Assigned to {ev.assigned_to_name}</span>
                          )}
                          {ev.follow_up_status && (
                            <span className="flex items-center gap-1 text-ui-tertiary">
                              <CheckCircle size={11} />
                              Follow-up: {ev.follow_up_status}
                            </span>
                          )}
                        </div>

                        {/* Event notes */}
                        {ev.event_notes && ev.event_notes.length > 0 && (
                          <div className="pt-2 border-t border-brand-forest/10">
                            {ev.event_notes.map(n => (
                              <div key={n.id} className="flex items-start gap-2 mt-1.5">
                                <StickyNote size={12} className="text-brand-terracotta mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm text-ui-secondary leading-relaxed">{n.note_text}</p>
                                  <p className="text-[11px] text-ui-tertiary mt-0.5">
                                    {n.author_name || 'Unknown'} &middot; {formatUSDate(new Date(n.created_at))}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : contact.scores && contact.scores.length > 0 ? (
                  /* Fallback to simple scores if event_history isn't populated */
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Scores Across Events</h4>
                    {contact.scores.map(score => (
                      <div key={score.id} className="flex items-center justify-between p-3 bg-brand-cream rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-brand-charcoal">{score.event_title}</div>
                          <div className="text-xs text-ui-tertiary">
                            {formatUSDate(new Date(score.scored_at))}
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getScoreColor(score.relevance_score)}`}>
                          {score.relevance_score}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Metadata */}
                <div className="pt-4 border-t border-ui-border text-xs text-ui-tertiary space-y-1">
                  <div>Source: {contact.source}</div>
                  <div>Created: {formatUSDateTime(new Date(contact.created_at))}</div>
                  <div>Updated: {formatUSDateTime(new Date(contact.updated_at))}</div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-ui-tertiary">Contact not found</div>
        )}
      </div>
    </>
  )
}
