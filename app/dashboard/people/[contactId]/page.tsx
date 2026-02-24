'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Mail, Phone, Building2, Briefcase, Linkedin, Globe,
  Sparkles, Edit3, Save, Trash2, Settings
} from 'lucide-react'
import { EnrichmentStatusBadge } from '@/app/components/EnrichmentStatusBadge'
import { TagEditor } from '@/app/components/TagEditor'

interface ContactDetail {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  emails: { email: string; type?: string }[]
  phones: { phone: string; type?: string }[]
  company: string | null
  title: string | null
  role_seniority: string | null
  industry: string | null
  linkedin_url: string | null
  twitter_url: string | null
  net_worth_range: string | null
  board_affiliations: string[]
  enrichment_status: string
  enrichment_data: Record<string, unknown>
  ai_summary: string | null
  tags: string[]
  internal_notes: string | null
  source: string
  event_history: unknown[]
  created_at: string
  updated_at: string
  scores: {
    id: string
    event_id: number
    event_title: string
    relevance_score: number
    score_rationale: string | null
    matched_objectives: unknown[]
    talking_points: string[]
    scored_at: string
  }[]
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params.contactId as string

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<ContactDetail>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchContact()
  }, [contactId])

  async function fetchContact() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`)
      if (res.ok) {
        const data = await res.json()
        setContact(data)
        setEditData({ tags: data.tags, internal_notes: data.internal_notes, full_name: data.full_name, company: data.company, title: data.title })
      } else if (res.status === 404) {
        router.push('/dashboard/people')
      }
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        await fetchContact()
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/people')
  }

  async function handleEnrich() {
    try {
      await fetch('/api/contacts/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: [contactId] }),
      })
      setTimeout(fetchContact, 2000)
    } catch (err) {
      console.error('Enrichment failed:', err)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f9fa] p-8">
        <div className="max-w-4xl mx-auto text-[#6e6e7e]">Loading...</div>
      </main>
    )
  }

  if (!contact) return null

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/98 backdrop-blur-sm border-b border-[#e1e4e8] z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-2xl font-bold text-[#1a1a2e]">Moots</Link>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-[#6e6e7e] hover:text-[#1a1a2e]">Events</Link>
              <Link href="/dashboard/people" className="text-sm font-semibold text-[#0f3460]">People</Link>
            </nav>
          </div>
          <Link href="/dashboard/settings" className="p-2 text-[#6e6e7e] hover:text-[#0f3460] rounded-lg hover:bg-[#f0f2f5]">
            <Settings size={18} />
          </Link>
        </div>
      </header>

      <div className="pt-[73px]">
        <div className="max-w-4xl mx-auto p-8 space-y-6">
          {/* Back Link */}
          <Link
            href="/dashboard/people"
            className="inline-flex items-center gap-1.5 text-sm text-[#6e6e7e] hover:text-[#0f3460]"
          >
            <ArrowLeft size={16} />
            Back to People
          </Link>

          {/* Profile Card */}
          <div className="bg-white border border-[#e1e4e8] rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                {contact.photo_url ? (
                  <img src={contact.photo_url} alt={contact.full_name} className="w-24 h-24 rounded-full object-cover border-2 border-[#e1e4e8]" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0f3460] to-[#1a1a2e] flex items-center justify-center shrink-0">
                    <span className="text-3xl font-bold text-white">{contact.full_name.charAt(0)}</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-[#1a1a2e]">{contact.full_name}</h1>
                      {contact.title && contact.company && (
                        <p className="text-[#4a4a5e] mt-1">{contact.title} @ {contact.company}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleEnrich} className="flex items-center gap-1.5 px-3 py-2 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors">
                        <Sparkles size={14} />
                        Enrich
                      </button>
                      <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-1.5 px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm font-medium text-[#4a4a5e] hover:bg-[#f8f9fa]">
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button onClick={handleDelete} className="p-2 text-[#6e6e7e] hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {contact.emails?.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                        <Mail size={14} className="text-[#6e6e7e]" />
                        {e.email}
                      </div>
                    ))}
                    {contact.phones?.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                        <Phone size={14} className="text-[#6e6e7e]" />
                        {p.phone}
                      </div>
                    ))}
                    {contact.industry && (
                      <div className="flex items-center gap-2 text-sm text-[#4a4a5e]">
                        <Globe size={14} className="text-[#6e6e7e]" />
                        {contact.industry}
                      </div>
                    )}
                    {contact.linkedin_url && (
                      <div className="flex items-center gap-2 text-sm">
                        <Linkedin size={14} className="text-[#6e6e7e]" />
                        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0f3460] hover:underline">LinkedIn</a>
                      </div>
                    )}
                  </div>

                  {/* Enrichment Badge */}
                  <div className="mt-4">
                    <EnrichmentStatusBadge status={contact.enrichment_status} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {contact.ai_summary && (
            <div className="bg-white border border-[#e1e4e8] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#0f3460]" />
                <h2 className="text-sm font-semibold text-[#1a1a2e]">AI Summary</h2>
              </div>
              <p className="text-sm text-[#4a4a5e] leading-relaxed">{contact.ai_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tags */}
            <div className="bg-white border border-[#e1e4e8] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3">Tags</h2>
              {isEditing ? (
                <TagEditor
                  tags={editData.tags || []}
                  onChange={(tags) => setEditData({ ...editData, tags })}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags?.length > 0 ? contact.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-[#f0f2f5] text-[#4a4a5e] text-sm rounded-full">{tag}</span>
                  )) : <span className="text-sm text-[#6e6e7e]">No tags</span>}
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="bg-white border border-[#e1e4e8] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3">Internal Notes</h2>
              {isEditing ? (
                <textarea
                  value={editData.internal_notes || ''}
                  onChange={(e) => setEditData({ ...editData, internal_notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:border-[#0f3460]"
                />
              ) : (
                <p className="text-sm text-[#4a4a5e]">{contact.internal_notes || 'No notes'}</p>
              )}
            </div>
          </div>

          {/* Edit Save */}
          {isEditing && (
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2.5 border border-[#e1e4e8] rounded-lg text-sm font-medium text-[#4a4a5e]">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors">
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Scores Across Events */}
          {contact.scores && contact.scores.length > 0 && (
            <div className="bg-white border border-[#e1e4e8] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[#1a1a2e] mb-4">Relevance Scores Across Events</h2>
              <div className="space-y-3">
                {contact.scores.map(score => (
                  <div key={score.id} className="flex items-center gap-4 p-4 bg-[#f8f9fa] rounded-lg">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        score.relevance_score >= 70 ? 'bg-emerald-100 text-emerald-700'
                          : score.relevance_score >= 40 ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-[#6e6e7e]'
                      }`}
                    >
                      {score.relevance_score}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#1a1a2e]">{score.event_title}</div>
                      {score.score_rationale && (
                        <p className="text-xs text-[#6e6e7e] mt-1 line-clamp-2">{score.score_rationale}</p>
                      )}
                    </div>
                    <div className="text-xs text-[#6e6e7e]">
                      {new Date(score.scored_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
