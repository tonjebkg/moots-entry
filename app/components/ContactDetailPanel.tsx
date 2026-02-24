'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Mail, Phone, Building2, Briefcase, Linkedin, Globe, Sparkles, Edit3, Save } from 'lucide-react'
import { EnrichmentStatusBadge } from './EnrichmentStatusBadge'
import { TagEditor } from './TagEditor'

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
  enrichment_status: string
  enrichment_data: Record<string, unknown>
  ai_summary: string | null
  tags: string[]
  internal_notes: string | null
  source: string
  created_at: string
  updated_at: string
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
  const [editTags, setEditTags] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

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
        setEditTags(data.tags || [])
        setEditNotes(data.internal_notes || '')
      }
    } catch (err) {
      console.error('Failed to fetch contact:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!contact) return
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: editTags, internal_notes: editNotes }),
      })
      if (res.ok) {
        await fetchContact()
        setIsEditing(false)
        onUpdate?.()
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl z-50 overflow-y-auto border-l border-[#e1e4e8]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e1e4e8] p-6 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Contact Profile</h2>
            {contact && <p className="text-sm text-[#6e6e7e]">{contact.full_name}</p>}
          </div>
          <button onClick={onClose} className="text-[#6e6e7e] hover:text-[#1a1a2e]">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-[#6e6e7e]">Loading...</div>
        ) : contact ? (
          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="text-center">
              {contact.photo_url ? (
                <Image src={contact.photo_url} alt={contact.full_name} width={80} height={80} className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-[#e1e4e8] object-cover" unoptimized />
              ) : (
                <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-[#0f3460] to-[#1a1a2e] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{contact.full_name.charAt(0)}</span>
                </div>
              )}
              <h3 className="text-xl font-semibold text-[#1a1a2e]">{contact.full_name}</h3>
              {contact.title && contact.company && (
                <p className="text-sm text-[#4a4a5e] mt-1">{contact.title} @ {contact.company}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onEnrich?.(contact.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Sparkles size={14} />
                Enrich
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm font-medium text-[#4a4a5e] hover:bg-[#f8f9fa]"
              >
                <Edit3 size={14} />
                Edit
              </button>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider">Contact Info</h4>
              {contact.emails?.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                  <Mail size={14} className="text-[#6e6e7e]" />
                  <span>{e.email}</span>
                  {e.type && <span className="text-xs text-[#6e6e7e]">({e.type})</span>}
                </div>
              ))}
              {contact.phones?.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                  <Phone size={14} className="text-[#6e6e7e]" />
                  <span>{p.phone}</span>
                </div>
              ))}
              {contact.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Linkedin size={14} className="text-[#6e6e7e]" />
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0f3460] hover:underline">
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </div>

            {/* Professional */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider">Professional</h4>
              {contact.company && (
                <div className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                  <Building2 size={14} className="text-[#6e6e7e]" />
                  <span>{contact.company}</span>
                </div>
              )}
              {contact.title && (
                <div className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                  <Briefcase size={14} className="text-[#6e6e7e]" />
                  <span>{contact.title}</span>
                </div>
              )}
              {contact.industry && (
                <div className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                  <Globe size={14} className="text-[#6e6e7e]" />
                  <span>{contact.industry}</span>
                </div>
              )}
            </div>

            {/* Enrichment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider">Enrichment</h4>
                <EnrichmentStatusBadge status={contact.enrichment_status} />
              </div>
              {contact.ai_summary && (
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6e6e7e] mb-2">
                    <Sparkles size={12} />
                    AI Summary
                  </div>
                  <p className="text-sm text-[#4a4a5e] leading-relaxed">{contact.ai_summary}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider">Tags</h4>
              {isEditing ? (
                <TagEditor tags={editTags} onChange={setEditTags} />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags?.length > 0 ? contact.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-[#f0f2f5] text-[#4a4a5e] text-xs rounded-full">
                      {tag}
                    </span>
                  )) : (
                    <span className="text-sm text-[#6e6e7e]">No tags</span>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider">Internal Notes</h4>
              {isEditing ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:border-[#0f3460]"
                />
              ) : (
                <p className="text-sm text-[#4a4a5e]">
                  {contact.internal_notes || 'No notes'}
                </p>
              )}
            </div>

            {/* Event Scores */}
            {contact.scores && contact.scores.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wider">Scores Across Events</h4>
                {contact.scores.map(score => (
                  <div key={score.id} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-[#1a1a2e]">{score.event_title}</div>
                      <div className="text-xs text-[#6e6e7e]">
                        {new Date(score.scored_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          score.relevance_score >= 70 ? 'bg-emerald-100 text-emerald-700'
                            : score.relevance_score >= 40 ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-[#6e6e7e]'
                        }`}
                      >
                        {score.relevance_score}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-2 pt-4 border-t border-[#e1e4e8]">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2.5 border border-[#e1e4e8] rounded-lg text-sm font-medium text-[#4a4a5e]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-[#e1e4e8] text-xs text-[#6e6e7e] space-y-1">
              <div>Source: {contact.source}</div>
              <div>Created: {new Date(contact.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(contact.updated_at).toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-[#6e6e7e]">Contact not found</div>
        )}
      </div>
    </>
  )
}
