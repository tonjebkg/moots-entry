'use client'

import { useEffect, useState } from 'react'
import { X, Users } from 'lucide-react'
import { AvatarInitials } from './ui/AvatarInitials'

interface TeamMember {
  user_id: string
  user_full_name: string
  user_email: string
  role: string
  user_avatar_url?: string | null
}

interface GuestAssignment {
  contact_id: string
  full_name: string
  company: string | null
}

interface TeamPanelProps {
  eventId: string
  onClose: () => void
  onGuestClick?: (contactId: string) => void
  filterMemberId?: string | null
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Event Lead',
  ADMIN: 'Admin',
  TEAM_MEMBER: 'Team Member',
  EXTERNAL_PARTNER: 'Partner',
  VIEWER: 'Viewer',
}

export function TeamPanel({ eventId, onClose, onGuestClick, filterMemberId }: TeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [assignments, setAssignments] = useState<Record<string, GuestAssignment[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedMember, setExpandedMember] = useState<string | null>(filterMemberId || null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch team members
        const membersRes = await fetch(`/api/events/${eventId}/team-members`)
        if (membersRes.ok) {
          const data = await membersRes.json()
          setMembers(data.members || [])
        }

        // Fetch team assignments
        const assignRes = await fetch(`/api/events/${eventId}/team-assignments`)
        if (assignRes.ok) {
          const data = await assignRes.json()
          // Group assignments by user_id (assigned_to)
          const grouped: Record<string, GuestAssignment[]> = {}
          for (const a of data.assignments || []) {
            const key = a.assigned_to
            if (!grouped[key]) grouped[key] = []
            grouped[key].push({
              contact_id: a.contact_id,
              full_name: a.contact_name || a.full_name || 'Unknown',
              company: a.contact_company || a.company || null,
            })
          }
          setAssignments(grouped)
        }
      } catch (err) {
        console.error('Failed to fetch team data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-ui-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-forest" />
            <h3 className="text-lg font-semibold text-brand-charcoal">Event Team</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-brand-cream rounded-lg">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-ui-tertiary text-sm">Loading team...</div>
          </div>
        ) : members.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-ui-tertiary text-sm">No team members yet</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {members.map(member => {
              const memberAssignments = assignments[member.user_id] || []
              const isExpanded = expandedMember === member.user_id

              return (
                <div key={member.user_id} className="bg-white border border-ui-border rounded-card overflow-hidden">
                  {/* Member header */}
                  <button
                    onClick={() => setExpandedMember(isExpanded ? null : member.user_id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-brand-cream/50 transition-colors"
                  >
                    <AvatarInitials name={member.user_full_name} size={40} />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-brand-charcoal">{member.user_full_name}</div>
                      <div className="text-xs text-ui-tertiary">
                        {ROLE_LABELS[member.role] || member.role}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-cream text-brand-charcoal">
                        {memberAssignments.length} guests
                      </span>
                    </div>
                  </button>

                  {/* Assigned guests (expanded) */}
                  {isExpanded && memberAssignments.length > 0 && (
                    <div className="border-t border-ui-border bg-brand-cream/30">
                      {memberAssignments.map(guest => (
                        <button
                          key={guest.contact_id}
                          onClick={() => onGuestClick?.(guest.contact_id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-cream transition-colors text-left"
                        >
                          <AvatarInitials name={guest.full_name} size={28} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-brand-charcoal truncate">{guest.full_name}</div>
                            {guest.company && (
                              <div className="text-xs text-ui-tertiary truncate">{guest.company}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isExpanded && memberAssignments.length === 0 && (
                    <div className="border-t border-ui-border px-4 py-3">
                      <p className="text-xs text-ui-tertiary">No guests assigned yet</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
