'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Linkedin, Mail, Building2, Target, MessageSquare, Users, Star } from 'lucide-react'
import type { DossierData } from '@/types/phase3'

interface DossierPanelProps {
  eventId: string
  contactId: string
  onClose: () => void
}

export function DossierPanel({ eventId, contactId, onClose }: DossierPanelProps) {
  const [dossier, setDossier] = useState<DossierData | null>(null)
  const [loading, setLoading] = useState(true)

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
    fetchDossier()
  }, [eventId, contactId])

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
          <h3 className="text-lg font-semibold text-brand-charcoal">Guest Dossier</h3>
          <button onClick={onClose} className="p-1 hover:bg-brand-cream rounded-lg">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-ui-tertiary text-sm">Loading dossier...</div>
          </div>
        ) : !dossier ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-ui-tertiary text-sm">Dossier not found</div>
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
                  <h4 className="text-sm font-semibold text-brand-charcoal">Objective Match</h4>
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

            {/* Team Assignments */}
            {dossier.team_assignments.length > 0 && (
              <div className="bg-white rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#2F4F3F]" />
                  <h4 className="text-sm font-semibold text-brand-charcoal">Team Assignments</h4>
                </div>
                <div className="space-y-2">
                  {dossier.team_assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-1">
                      <div className="text-sm text-ui-secondary">
                        {a.assigned_to_name || a.assigned_to_email}
                      </div>
                      <span className="text-xs font-medium text-ui-tertiary bg-brand-cream px-2 py-0.5 rounded">
                        {a.role}
                      </span>
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
