'use client'

import { Send, Clock, AlertCircle, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import type { BroadcastMessage } from '@/types/phase3'
import { BROADCAST_STATUS_META } from '@/types/phase3'

interface BroadcastHistoryListProps {
  broadcasts: BroadcastMessage[]
  eventId: string
  onSend: (broadcastId: string) => void
  onDelete: (broadcastId: string) => void
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DRAFT: Clock,
  SCHEDULED: Clock,
  SENDING: Send,
  SENT: CheckCircle2,
  FAILED: AlertCircle,
  CANCELLED: XCircle,
}

export function BroadcastHistoryList({ broadcasts, eventId, onSend, onDelete }: BroadcastHistoryListProps) {
  if (broadcasts.length === 0) {
    return (
      <div className="bg-white border border-ui-border rounded-lg p-8 text-center">
        <p className="text-sm text-ui-tertiary">No broadcasts yet. Compose your first message above.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-ui-border">
        <h3 className="text-sm font-semibold text-brand-charcoal">Broadcast History</h3>
      </div>
      <div className="divide-y divide-ui-border">
        {broadcasts.map((b) => {
          const meta = BROADCAST_STATUS_META[b.status]
          const StatusIcon = STATUS_ICONS[b.status] || Clock
          const isDraftOrScheduled = b.status === 'DRAFT' || b.status === 'SCHEDULED'

          return (
            <div key={b.id} className="px-4 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-brand-charcoal truncate">{b.subject}</h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${meta.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-ui-tertiary line-clamp-1">{b.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-ui-tertiary">
                    {b.created_by_name && <span>By {b.created_by_name}</span>}
                    <span>{new Date(b.created_at).toLocaleDateString()}</span>
                    {b.status === 'SENT' && (
                      <span>
                        {b.delivered_count} delivered, {b.failed_count} failed
                      </span>
                    )}
                  </div>
                </div>
                {isDraftOrScheduled && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onSend(b.id)}
                      className="px-3 py-1.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => onDelete(b.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
