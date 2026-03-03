'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Linkedin, Mail, Building2, Target, MessageSquare, Users, Star, ArrowRight, StickyNote, Send } from 'lucide-react'
import type { DossierData } from '@/types/phase3'

interface DossierPanelProps {
  eventId: string
  contactId: string
  onClose: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  RSVP_SUBMISSION: 'RSVP',
  JOIN_REQUEST: 'Join Request',
  CSV_IMPORT: 'CSV Import',
  EVENT_IMPORT: 'Event Import',
  MANUAL: 'Manual Entry',
  ENRICHMENT: 'Enrichment',
  API: 'API',
}

const INVITATION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONSIDERING: { label: 'Selected', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  INVITED: { label: 'Invited', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  ACCEPTED: { label: 'Confirmed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  DECLINED: { label: 'Declined', color: 'text-red-700 bg-red-50 border-red-200' },
  WAITLIST: { label: 'Waitlist', color: 'text-gray-600 bg-gray-100 border-gray-200' },
  BOUNCED: { label: 'Bounced', color: 'text-red-700 bg-red-50 border-red-200' },
}

interface EventNote {
  id: string
  note_text: string
  author_name: string | null
  created_at: string
}

export function DossierPanel({ eventId, contactId, onClose }: DossierPanelProps) {
  const [dossier, setDossier] = useState<DossierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventNotes, setEventNotes] = useState<EventNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    async function fetchDossier() {
      try {
        const res = await fetch(`/api/events/${eventId}/dossiers/${contactId}`)
        if (res.ok) {
          setDossier(await res.json())
        }
      } catch (err) {
        console.error('Failed to fetch dossier:', err)
      } finally {
        setLoading(false)
      }
    }
    async function fetchNotes() {
      try {
        const res = await fetch(`/api/events/${eventId}/contacts/${contactId}/notes`)
        if (res.ok) {
          const data = await res.json()
          setEventNotes(data.notes || [])
        }
      } catch {
        // event_notes table may not exist yet
      }
    }
    fetchDossier()
    fetchNotes()
  }, [eventId, contactId])

  async function handleAddNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/events/${eventId}/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: newNote.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setEventNotes(prev => [data.note, ...prev])
        setNewNote('')
      }
    } catch (err) {
      console.error('Failed to save note:', err)
    } finally {
      setSavingNote(false)
    }
  }

  async function handleChangeStatus(newStatus: string) {
    if (!dossier?.invitation_id) return
    try {
      const res = await fetch(`/api/invitations/${dossier.invitation_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setDossier(prev => prev ? { ...prev, invitation_status: newStatus } : prev)
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-700 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[700px] bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-ui-border px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-brand-charcoal">Guest Profile</h3>
          <button onClick={onClose} className="p-1 hover:bg-brand-cream rounded-lg">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-ui-tertiary text-sm">Loading profile...</div>
          </div>
        ) : !dossier ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-ui-tertiary text-sm">Guest profile not found</div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#2F4F3F] flex items-center justify-center text-white text-xl font-semibold shrink-0">
                {dossier.photo_url ? (
                  <Image src={dossier.photo_url} alt="" width={64} height={64} className="w-16 h-16 rounded-full object-cover" unoptimized />
                ) : (
                  dossier.full_name?.charAt(0)?.toUpperCase() || '?'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold font-display text-brand-charcoal truncate">{dossier.full_name}</h2>
                {(dossier.title || dossier.company) && (
                  <p className="text-sm text-ui-secondary mt-0.5">
                    {dossier.title}{dossier.title && dossier.company ? ' at ' : ''}{dossier.company}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {dossier.email && (
                    <a href={`mailto:${dossier.email}`} className="text-ui-tertiary hover:text-brand-charcoal">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {dossier.linkedin_url && (
                    <a href={dossier.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-ui-tertiary hover:text-[#0077b5]">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              {dossier.relevance_score !== null && (
                <div className={`px-3 py-1.5 border rounded-lg text-center ${getScoreColor(dossier.relevance_score)}`}>
                  <div className="text-2xl font-bold">{dossier.relevance_score}</div>
                  <div className="text-xs font-medium">Score</div>
                </div>
              )}
            </div>

            {/* Event Journey */}
            <div className="bg-white rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="w-4 h-4 text-brand-forest" />
                <h4 className="text-sm font-semibold text-brand-charcoal">Event Journey</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Source — show Campaign if guest has invitation, otherwise use stored source */}
                <div>
                  <span className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider">Source</span>
                  <div className="mt-1">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded border bg-gray-100 text-gray-700 border-gray-200">
                      {dossier.invitation_id
                        ? 'Campaign'
                        : dossier.source ? (SOURCE_LABELS[dossier.source] || dossier.source) : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Enrichment — show Completed if AI content (summary, talking points, score) exists */}
                <div>
                  <span className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider">Enrichment</span>
                  <div className="mt-1">
                    {dossier.enrichment_status === 'COMPLETED' || dossier.ai_summary || dossier.talking_points.length > 0 || dossier.relevance_score !== null ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                        Enriched
                      </span>
                    ) : dossier.enrichment_status === 'PENDING' ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded border bg-amber-50 text-amber-700 border-amber-200">
                        Pending
                      </span>
                    ) : dossier.enrichment_status === 'FAILED' ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded border bg-red-50 text-red-700 border-red-200">
                        Failed
                      </span>
                    ) : (
                      <span className="text-xs text-ui-tertiary">Not started</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div>
                  <span className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider">Score</span>
                  <div className="mt-1">
                    {dossier.relevance_score !== null ? (
                      <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded border ${getScoreColor(dossier.relevance_score)}`}>
                        {dossier.relevance_score}
                      </span>
                    ) : (
                      <span className="text-xs text-ui-tertiary">Not yet scored</span>
                    )}
                  </div>
                </div>

                {/* Invitation */}
                <div>
                  <span className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider">Invitation</span>
                  <div className="mt-1">
                    {dossier.invitation_id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={dossier.invitation_status || ''}
                          onChange={(e) => handleChangeStatus(e.target.value)}
                          className="px-2 py-1 border border-ui-border rounded-lg text-xs font-medium text-ui-secondary bg-white focus:outline-none focus:border-brand-terracotta"
                        >
                          <option value="CONSIDERING">Selected</option>
                          <option value="INVITED">Invited</option>
                          <option value="ACCEPTED">Confirmed</option>
                          <option value="DECLINED">Declined</option>
                          <option value="WAITLIST">Waitlist</option>
                        </select>
                        {dossier.campaign_name && (
                          <span className="text-[11px] text-ui-tertiary">{dossier.campaign_name}</span>
                        )}
                      </div>
                    ) : dossier.invitation_status ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${INVITATION_STATUS_LABELS[dossier.invitation_status]?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {INVITATION_STATUS_LABELS[dossier.invitation_status]?.label || dossier.invitation_status}
                        </span>
                        {dossier.campaign_name && (
                          <span className="text-[11px] text-ui-tertiary">{dossier.campaign_name}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-ui-tertiary">Not invited</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Team Assignments — positioned immediately after Event Journey */}
            {dossier.team_assignments.length > 0 && (
              <div className="bg-white rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#2F4F3F]" />
                  <h4 className="text-sm font-semibold text-brand-charcoal">Team Assignment</h4>
                </div>
                <div className="space-y-2">
                  {dossier.team_assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-1">
                      <div className="w-7 h-7 rounded-full bg-[#2F4F3F] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {(a.assigned_to_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-brand-charcoal">{a.assigned_to_name || a.assigned_to_email}</div>
                        <div className="text-xs text-ui-tertiary">{a.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Notes */}
            <div className="bg-white rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote className="w-4 h-4 text-brand-terracotta" />
                <h4 className="text-sm font-semibold text-brand-charcoal">Event Notes</h4>
              </div>

              {/* Add note input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Add a note about this guest..."
                  className="flex-1 px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || savingNote}
                  className="px-3 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Existing notes */}
              {eventNotes.length > 0 ? (
                <div className="space-y-2">
                  {eventNotes.map(note => (
                    <div key={note.id} className="p-2.5 bg-brand-cream rounded-lg">
                      <p className="text-sm text-ui-secondary leading-relaxed">{note.note_text}</p>
                      <p className="text-[11px] text-ui-tertiary mt-1">
                        {note.author_name || 'Unknown'} &middot; {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ui-tertiary">No notes yet for this event</p>
              )}
            </div>

            {/* Tags */}
            {dossier.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {dossier.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-brand-cream text-ui-secondary text-xs font-medium rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* AI Summary */}
            {dossier.ai_summary && (
              <div className="bg-brand-cream rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-[#B8755E]" />
                  <h4 className="text-sm font-semibold text-brand-charcoal">AI Summary</h4>
                </div>
                <p className="text-sm text-ui-secondary leading-relaxed">{dossier.ai_summary}</p>
              </div>
            )}

            {/* Score Rationale */}
            {dossier.score_rationale && (
              <div className="bg-white rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#2F4F3F]" />
                  <h4 className="text-sm font-semibold text-brand-charcoal">Why They Match</h4>
                </div>
                <p className="text-sm text-ui-secondary leading-relaxed">{dossier.score_rationale}</p>
              </div>
            )}

            {/* Talking Points */}
            {dossier.talking_points.length > 0 && (
              <div className="bg-white rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-[#B8755E]" />
                  <h4 className="text-sm font-semibold text-brand-charcoal">Talking Points</h4>
                </div>
                <ul className="space-y-2">
                  {dossier.talking_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B8755E] mt-1.5 shrink-0" />
                      <span className="text-sm text-ui-secondary">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Matched Objectives */}
            {dossier.matched_objectives.length > 0 && (
              <div className="bg-white rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-[#2F4F3F]" />
                  <h4 className="text-sm font-semibold text-brand-charcoal">Criteria Match</h4>
                </div>
                <div className="space-y-3">
                  {dossier.matched_objectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(obj.match_score)}`}>
                        {obj.match_score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-brand-charcoal">{obj.objective_text}</div>
                        <div className="text-xs text-ui-tertiary mt-0.5">{obj.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
