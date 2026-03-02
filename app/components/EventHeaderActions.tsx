'use client'

import { useState } from 'react'
import { Edit2, Users } from 'lucide-react'
import { TeamPanel } from './TeamPanel'
import { DossierPanel } from './DossierPanel'

interface EventHeaderActionsProps {
  eventId: string
  capacityFilled: number
  totalCapacity: number
}

export function EventHeaderActions({ eventId, capacityFilled, totalCapacity }: EventHeaderActionsProps) {
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)

  return (
    <div className="shrink-0 flex items-start gap-3">
      <button
        onClick={() => setShowTeamPanel(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-ui-border hover:border-brand-forest text-brand-charcoal text-sm font-semibold rounded-lg transition-colors"
      >
        <Users size={16} className="text-brand-forest" />
        Team
      </button>
      <button
        onClick={() => {
          // TODO: Open edit event modal
          alert('Edit Event modal - to be implemented')
        }}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-ui-border hover:border-brand-terracotta text-brand-charcoal text-sm font-semibold rounded-lg transition-colors"
      >
        <Edit2 size={16} />
        Edit Event
      </button>

      {showTeamPanel && (
        <TeamPanel
          eventId={eventId}
          onClose={() => setShowTeamPanel(false)}
          onGuestClick={(contactId) => {
            setShowTeamPanel(false)
            setDossierContactId(contactId)
          }}
        />
      )}

      {dossierContactId && (
        <DossierPanel
          eventId={eventId}
          contactId={dossierContactId}
          onClose={() => setDossierContactId(null)}
        />
      )}
    </div>
  )
}
