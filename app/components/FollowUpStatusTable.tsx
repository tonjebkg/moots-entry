'use client'

import { Send, Eye, MessageSquare, CalendarCheck, Mail } from 'lucide-react'
import type { FollowUpSequence } from '@/types/phase3'
import { FOLLOW_UP_STATUS_META } from '@/types/phase3'
import { ScoreBar } from './ui/ScoreBar'
import { TagBadge } from './ui/TagBadge'

function getTagVariant(tag: string): 'terracotta' | 'gold' | 'forest' | 'default' {
  const t = tag.toLowerCase()
  if (t.includes('vip') || t.includes('sponsor')) return 'terracotta'
  if (t.includes('speaker') || t.includes('host')) return 'gold'
  if (t.includes('portfolio') || t.includes('partner')) return 'forest'
  return 'default'
}

interface FollowUpStatusTableProps {
  followUps: FollowUpSequence[]
  onSend: (id: string) => void
  onUpdateStatus: (id: string, status: string) => void
}

export function FollowUpStatusTable({ followUps, onSend, onUpdateStatus }: FollowUpStatusTableProps) {
  if (followUps.length === 0) {
    return (
      <div className="bg-white border border-ui-border rounded-lg p-8 text-center">
        <Mail className="w-10 h-10 text-ui-tertiary opacity-50 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-brand-charcoal mb-1">No Follow-Ups Yet</h4>
        <p className="text-sm text-ui-tertiary max-w-md mx-auto">
          I&apos;ll draft personalized follow-ups for each scored contact, referencing their profile and your event objectives. Use the form above to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-brand-cream border-b border-ui-border">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Contact</th>
            <th className="px-4 py-3 text-center font-semibold text-brand-charcoal w-20">Score</th>
            <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Tags</th>
            <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Subject</th>
            <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Status</th>
            <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-border">
          {followUps.map((fu) => {
            const meta = FOLLOW_UP_STATUS_META[fu.status]
            return (
              <tr key={fu.id} className="hover:bg-brand-cream">
                <td className="px-4 py-3">
                  <div className="font-medium text-brand-charcoal">{fu.contact_name}</div>
                  <div className="text-xs text-ui-tertiary">
                    {fu.contact_title && fu.contact_company
                      ? `${fu.contact_title} · ${fu.contact_company}`
                      : fu.contact_company || fu.contact_title || ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {fu.relevance_score != null ? (
                    <ScoreBar score={fu.relevance_score} width={60} />
                  ) : (
                    <span className="text-xs text-ui-tertiary">--</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {fu.tags && fu.tags.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <TagBadge label={fu.tags[0]} variant={getTagVariant(fu.tags[0])} />
                      {fu.tags.length > 1 && (
                        <span className="text-[10px] font-semibold text-ui-tertiary bg-gray-100 px-1.5 py-0.5 rounded" title={fu.tags.slice(1).join(', ')}>
                          +{fu.tags.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-ui-tertiary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ui-secondary max-w-[200px] truncate">
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
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-forest hover:bg-green-50 rounded transition-colors"
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
