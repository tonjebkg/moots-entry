'use client'

import { FileText, Trash2, Users, Clock } from 'lucide-react'
import type { BriefingPacket } from '@/types/phase3'
import { BRIEFING_STATUS_META } from '@/types/phase3'

interface BriefingCardProps {
  briefing: BriefingPacket
  onView: (id: string) => void
  onDelete: (id: string) => void
}

export function BriefingCard({ briefing, onView, onDelete }: BriefingCardProps) {
  const meta = BRIEFING_STATUS_META[briefing.status]

  return (
    <div className="bg-white border border-ui-border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-brand-cream border border-ui-border flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-brand-terracotta" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-brand-charcoal truncate">{briefing.title}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-ui-tertiary">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {briefing.guest_count} guests
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(briefing.created_at).toLocaleDateString()}
              </span>
              {briefing.generated_for_name && (
                <span>For: {briefing.generated_for_name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${meta.color}`}>
            {meta.label}
          </span>
          {briefing.status === 'READY' && (
            <button
              onClick={() => onView(briefing.id)}
              className="px-3 py-1 text-xs font-medium text-brand-forest border border-brand-forest rounded-lg hover:bg-brand-forest hover:text-white transition-colors"
            >
              View
            </button>
          )}
          <button
            onClick={() => onDelete(briefing.id)}
            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
