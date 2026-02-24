'use client'

import { Send, Eye, MessageSquare, CalendarCheck } from 'lucide-react'
import type { FollowUpSequence } from '@/types/phase3'
import { FOLLOW_UP_STATUS_META } from '@/types/phase3'

interface FollowUpStatusTableProps {
  followUps: FollowUpSequence[]
  onSend: (id: string) => void
  onUpdateStatus: (id: string, status: string) => void
}

export function FollowUpStatusTable({ followUps, onSend, onUpdateStatus }: FollowUpStatusTableProps) {
  if (followUps.length === 0) {
    return (
      <div className="bg-white border border-[#e1e4e8] rounded-lg p-8 text-center">
        <p className="text-sm text-[#6e6e7e]">No follow-ups configured. Generate follow-ups above.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#f8f9fa] border-b border-[#e1e4e8]">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Contact</th>
            <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Subject</th>
            <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Status</th>
            <th className="px-4 py-3 text-right font-semibold text-[#1a1a2e]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e1e4e8]">
          {followUps.map((fu) => {
            const meta = FOLLOW_UP_STATUS_META[fu.status]
            return (
              <tr key={fu.id} className="hover:bg-[#f8f9fa]">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#1a1a2e]">{fu.contact_name}</div>
                  <div className="text-xs text-[#6e6e7e]">
                    {fu.contact_company}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#4a4a5e] max-w-[200px] truncate">
                  {fu.subject}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${meta.color}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {fu.status === 'PENDING' && (
                      <button
                        onClick={() => onSend(fu.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#2F4F3F] hover:bg-green-50 rounded transition-colors"
                        title="Send follow-up"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </button>
                    )}
                    {fu.status === 'SENT' && (
                      <button
                        onClick={() => onUpdateStatus(fu.id, 'OPENED')}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Mark as opened"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                    {(fu.status === 'SENT' || fu.status === 'OPENED') && (
                      <button
                        onClick={() => onUpdateStatus(fu.id, 'REPLIED')}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Mark as replied"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    )}
                    {(fu.status === 'REPLIED' || fu.status === 'OPENED') && (
                      <button
                        onClick={() => onUpdateStatus(fu.id, 'MEETING_BOOKED')}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="Mark meeting booked"
                      >
                        <CalendarCheck className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
