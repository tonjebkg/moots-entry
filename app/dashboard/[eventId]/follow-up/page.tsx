'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Download } from 'lucide-react'
import { FollowUpConfigPanel } from '@/app/components/FollowUpConfigPanel'
import { FollowUpStatusTable } from '@/app/components/FollowUpStatusTable'
import type { FollowUpSequence } from '@/types/phase3'

export default function FollowUpPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [followUps, setFollowUps] = useState<FollowUpSequence[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  async function fetchFollowUps() {
    try {
      const res = await fetch(`/api/events/${eventId}/follow-up`)
      if (res.ok) {
        const data = await res.json()
        setFollowUps(data.follow_ups || [])
        setStats(data.stats || {})
      }
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFollowUps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function handleSend(followUpId: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/follow-up/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })
      if (res.ok) {
        fetchFollowUps()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send')
      }
    } catch {
      alert('Failed to send')
    }
  }

  async function handleUpdateStatus(followUpId: string, status: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/follow-up/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) fetchFollowUps()
    } catch {
      alert('Failed to update')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#6e6e7e] text-sm font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1a1a2e] tracking-tight">Follow-Up</h2>
          <p className="text-sm text-[#4a4a5e] mt-1">
            AI-personalized post-event follow-up emails with status tracking.
          </p>
        </div>
        {followUps.length > 0 && (
          <a
            href={`/api/events/${eventId}/follow-up/export`}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#4a4a5e] border border-[#e1e4e8] rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        )}
      </div>

      {/* Stats */}
      {followUps.length > 0 && (
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total || 0, color: 'bg-gray-50 text-[#1a1a2e]' },
            { label: 'Pending', value: stats.pending || 0, color: 'bg-gray-50 text-gray-700' },
            { label: 'Sent', value: stats.sent || 0, color: 'bg-blue-50 text-blue-700' },
            { label: 'Opened', value: stats.opened || 0, color: 'bg-cyan-50 text-cyan-700' },
            { label: 'Replied', value: stats.replied || 0, color: 'bg-green-50 text-green-700' },
            { label: 'Meetings', value: stats.meeting_booked || 0, color: 'bg-emerald-50 text-emerald-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-3 border border-[#e1e4e8] ${s.color}`}>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs font-medium opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <FollowUpConfigPanel eventId={eventId} onTriggered={fetchFollowUps} />

      <FollowUpStatusTable
        followUps={followUps}
        onSend={handleSend}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  )
}
