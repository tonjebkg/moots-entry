'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Linkedin, Mail, Phone, Building, Briefcase, FileText, Tag, Users, Calendar, Check, AlertCircle, Edit2, Save } from 'lucide-react'
import { GuestProfile, getFullName, getDisplayTitle, isEnriched, getEnrichmentSources, hasEnrichmentFrom, getLatestEnrichment, TIER_META, PRIORITY_META, STATUS_META } from '@/types/guest'

interface GuestDetailPanelProps {
  guest: GuestProfile
  onClose: () => void
  onUpdate?: (updates: Partial<GuestProfile>) => Promise<void>
}

export function GuestDetailPanel({ guest, onClose, onUpdate }: GuestDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedGuest, setEditedGuest] = useState(guest)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!onUpdate) return

    try {
      setSaving(true)
      await onUpdate(editedGuest)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update guest:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditedGuest(guest)
    setIsEditing(false)
  }

  const displayGuest = isEditing ? editedGuest : guest
  const fullName = getFullName(displayGuest)
  const displayTitle = getDisplayTitle(displayGuest)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[700px] bg-white shadow-2xl z-50 overflow-y-auto border-l border-ui-border">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-ui-border p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-brand-charcoal mb-1">Guest Profile</h2>
            <p className="text-sm text-ui-tertiary">{fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ui-tertiary hover:text-brand-charcoal transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Picture & Basic Info */}
          <div className="text-center">
            {displayGuest.profile_picture_url ? (
              <Image
                src={displayGuest.profile_picture_url}
                alt={fullName}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-2 border-ui-border"
                unoptimized
              />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-brand-terracotta/80 to-brand-forest flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {displayGuest.first_name[0]}{displayGuest.last_name[0]}
                </span>
              </div>
            )}
            <h3 className="text-xl font-semibold font-display text-brand-charcoal mb-1">{fullName}</h3>
            {displayTitle && (
              <p className="text-sm text-ui-secondary mb-3">{displayTitle}</p>
            )}
            {displayGuest.linkedin_url && (
              <a
                href={displayGuest.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-brand-terracotta hover:text-brand-terracotta/70 font-medium transition-colors"
              >
                <Linkedin size={16} />
                View LinkedIn Profile
              </a>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-brand-charcoal mb-3">Contact</h4>
            <div className="flex items-start gap-3 text-sm">
              <Mail className="text-ui-tertiary shrink-0 mt-0.5" size={16} />
              <a href={`mailto:${displayGuest.email}`} className="text-ui-secondary hover:text-brand-terracotta break-all">
                {displayGuest.email}
              </a>
            </div>
            {displayGuest.phone && (
              <div className="flex items-start gap-3 text-sm">
                <Phone className="text-ui-tertiary shrink-0 mt-0.5" size={16} />
                <a href={`tel:${displayGuest.phone}`} className="text-ui-secondary hover:text-brand-terracotta">
                  {displayGuest.phone}
                </a>
              </div>
            )}
            {displayGuest.company && (
              <div className="flex items-start gap-3 text-sm">
                <Building className="text-ui-tertiary shrink-0 mt-0.5" size={16} />
                <span className="text-ui-secondary">{displayGuest.company}</span>
              </div>
            )}
            {displayGuest.title && (
              <div className="flex items-start gap-3 text-sm">
                <Briefcase className="text-ui-tertiary shrink-0 mt-0.5" size={16} />
                <span className="text-ui-secondary">{displayGuest.title}</span>
              </div>
            )}
          </div>

          {/* Event Context */}
          <div className="space-y-3 p-4 bg-brand-cream rounded-lg">
            <h4 className="text-sm font-semibold text-brand-charcoal mb-3">Event Context</h4>

            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-ui-tertiary mb-1">Tier</label>
                  <select
                    value={editedGuest.tier}
                    onChange={(e) => setEditedGuest({ ...editedGuest, tier: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  >
                    {Object.entries(TIER_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ui-tertiary mb-1">Priority</label>
                  <select
                    value={editedGuest.priority}
                    onChange={(e) => setEditedGuest({ ...editedGuest, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  >
                    {Object.entries(PRIORITY_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ui-tertiary mb-1">Expected +1s</label>
                  <input
                    type="number"
                    min="0"
                    value={editedGuest.expected_plus_ones}
                    onChange={(e) => setEditedGuest({ ...editedGuest, expected_plus_ones: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ui-tertiary">Tier</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded bg-${TIER_META[displayGuest.tier].color}-100 text-${TIER_META[displayGuest.tier].color}-800`}>
                    {TIER_META[displayGuest.tier].label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ui-tertiary">Priority</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded bg-${PRIORITY_META[displayGuest.priority].color}-100 text-${PRIORITY_META[displayGuest.priority].color}-800`}>
                    {PRIORITY_META[displayGuest.priority].label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ui-tertiary">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded bg-${STATUS_META[displayGuest.status].color}-100 text-${STATUS_META[displayGuest.status].color}-800`}>
                    {STATUS_META[displayGuest.status].label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ui-tertiary">Expected +1s</span>
                  <span className="font-semibold text-brand-charcoal">{displayGuest.expected_plus_ones}</span>
                </div>
              </>
            )}
          </div>

          {/* Curation Intelligence */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-brand-charcoal">Curation Intelligence</h4>
              {!isEditing && onUpdate && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs text-brand-terracotta hover:text-brand-terracotta/70 font-medium"
                >
                  <Edit2 size={12} />
                  Edit
                </button>
              )}
            </div>

            {/* Introduction Source */}
            {(isEditing || displayGuest.introduction_source) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-ui-tertiary" size={16} />
                  <label className="text-xs font-medium text-ui-tertiary">Introduced By</label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedGuest.introduction_source || ''}
                    onChange={(e) => setEditedGuest({ ...editedGuest, introduction_source: e.target.value })}
                    placeholder="e.g., Sarah Chen (Partner)"
                    className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                ) : (
                  <p className="text-sm text-ui-secondary pl-6">{displayGuest.introduction_source}</p>
                )}
              </div>
            )}

            {/* Host Notes */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-ui-tertiary" size={16} />
                <label className="text-xs font-medium text-ui-tertiary">Host Notes</label>
              </div>
              {isEditing ? (
                <textarea
                  value={editedGuest.host_notes || ''}
                  onChange={(e) => setEditedGuest({ ...editedGuest, host_notes: e.target.value })}
                  placeholder="Why they matter for this event..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                />
              ) : displayGuest.host_notes ? (
                <p className="text-sm text-ui-secondary leading-relaxed pl-6">{displayGuest.host_notes}</p>
              ) : (
                <p className="text-sm text-ui-tertiary italic pl-6">No notes yet</p>
              )}
            </div>

            {/* Tags */}
            {(isEditing || (displayGuest.tags && displayGuest.tags.length > 0)) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="text-ui-tertiary" size={16} />
                  <label className="text-xs font-medium text-ui-tertiary">Tags</label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedGuest.tags?.join(', ') || ''}
                    onChange={(e) => setEditedGuest({ ...editedGuest, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    placeholder="Portfolio CEO, Key LP, Board Member"
                    className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2 pl-6">
                    {displayGuest.tags?.map((tag, i) => (
                      <span key={i} className="px-2 py-1 text-xs font-medium rounded bg-brand-cream text-ui-secondary border border-ui-border">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enrichment Status */}
          <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <h4 className="text-sm font-semibold text-brand-charcoal mb-3">Enrichment Status</h4>

            {isEnriched(displayGuest) ? (
              <div className="space-y-2">
                {displayGuest.enrichment_sources?.map((enrichment, index) => (
                  <div key={index} className="flex items-start justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {enrichment.source === 'linkedin' || enrichment.source === 'coresignal' ? (
                        <Linkedin className="text-brand-terracotta shrink-0" size={16} />
                      ) : (
                        <Check className="text-emerald-600 shrink-0" size={16} />
                      )}
                      <div>
                        <span className="text-ui-secondary font-medium capitalize">{enrichment.source}</span>
                        {enrichment.enriched_fields && enrichment.enriched_fields.length > 0 && (
                          <p className="text-xs text-ui-tertiary">
                            {enrichment.enriched_fields.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Check className="text-emerald-600" size={16} />
                      </div>
                      <p className="text-xs text-ui-tertiary mt-0.5">
                        {new Date(enrichment.enriched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-ui-tertiary">
                <AlertCircle size={16} />
                <span className="text-sm">No enrichment data yet</span>
              </div>
            )}

            {displayGuest.last_enriched_at && (
              <p className="text-xs text-ui-tertiary pt-2 border-t border-blue-200">
                Last enriched: {new Date(displayGuest.last_enriched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}

            {/* Re-enrich Button (for future) */}
            {isEnriched(displayGuest) && (
              <button className="w-full px-3 py-2 text-sm text-brand-terracotta hover:text-brand-terracotta/70 hover:bg-white rounded-lg transition-colors font-medium border border-blue-200">
                Re-enrich Profile
              </button>
            )}
          </div>

          {/* Past Events (placeholder for future) */}
          {displayGuest.past_events && displayGuest.past_events.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="text-ui-tertiary" size={16} />
                <h4 className="text-sm font-semibold text-brand-charcoal">Past Events</h4>
              </div>
              <div className="space-y-2 pl-6">
                {displayGuest.past_events.map((eventId) => (
                  <div key={eventId} className="text-sm text-ui-secondary">
                    Event #{eventId}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex gap-2 pt-4 border-t border-ui-border">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-white border border-ui-border rounded-lg text-ui-secondary hover:bg-brand-cream transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white rounded-lg transition-colors shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
