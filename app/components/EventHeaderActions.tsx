'use client'

import { useState } from 'react'
import { Edit2 } from 'lucide-react'

interface EventHeaderActionsProps {
  eventId: string
  capacityFilled: number
  totalCapacity: number
}

export function EventHeaderActions({ eventId, capacityFilled, totalCapacity }: EventHeaderActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false)

  return (
    <div className="shrink-0 flex items-start gap-4">
      {totalCapacity > 0 && (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <span>{capacityFilled} / {totalCapacity}</span>
        </span>
      )}
      <button
        onClick={() => {
          // TODO: Open edit event modal
          alert('Edit Event modal - to be implemented')
        }}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e1e4e8] hover:border-[#0f3460] text-[#1a1a2e] text-sm font-semibold rounded-lg transition-colors"
      >
        <Edit2 size={16} />
        Edit Event
      </button>
    </div>
  )
}
