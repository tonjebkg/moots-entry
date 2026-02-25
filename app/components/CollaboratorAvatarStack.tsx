'use client'

import { useState, useRef, useEffect } from 'react'
import { AvatarInitials } from '@/app/components/ui/AvatarInitials'

interface Member {
  id: string
  name: string
  email: string
  role: string
}

interface CollaboratorAvatarStackProps {
  members: Member[]
  maxVisible?: number
  onManageClick?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  TEAM_MEMBER: 'Team Member',
  EXTERNAL_PARTNER: 'Partner',
  VIEWER: 'Viewer',
}

export function CollaboratorAvatarStack({
  members,
  maxVisible = 4,
  onManageClick,
}: CollaboratorAvatarStackProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const visible = members.slice(0, maxVisible)
  const overflowCount = Math.max(0, members.length - maxVisible)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [popoverOpen])

  if (members.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className="flex items-center -space-x-2 hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracotta rounded-full"
        title={`${members.length} team member${members.length !== 1 ? 's' : ''}`}
      >
        {visible.map((member) => (
          <div
            key={member.id}
            className="ring-2 ring-white rounded-full"
          >
            <AvatarInitials name={member.name || member.email} size={28} />
          </div>
        ))}
        {overflowCount > 0 && (
          <div className="ring-2 ring-white rounded-full w-7 h-7 bg-brand-cream text-[11px] font-semibold text-ui-tertiary flex items-center justify-center shrink-0">
            +{overflowCount}
          </div>
        )}
      </button>

      {popoverOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-card shadow-lg border border-ui-border py-2 z-50">
          <div className="px-4 py-2 border-b border-ui-border">
            <h4 className="text-xs font-semibold text-ui-tertiary uppercase tracking-wider">Team Members</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                <AvatarInitials name={member.name || member.email} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-brand-charcoal truncate">
                    {member.name || member.email}
                  </div>
                  <div className="text-[11px] text-ui-tertiary">
                    {ROLE_LABELS[member.role] || member.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {onManageClick && (
            <div className="px-4 py-2 border-t border-ui-border">
              <button
                onClick={() => {
                  setPopoverOpen(false)
                  onManageClick()
                }}
                className="text-sm font-semibold text-brand-terracotta hover:text-brand-terracotta/70 transition-colors"
              >
                Manage Team
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
