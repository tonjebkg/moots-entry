'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BroadcastComposer } from '@/app/components/BroadcastComposer'
import { BroadcastHistoryList } from '@/app/components/BroadcastHistoryList'
import type { BroadcastMessage } from '@/types/phase3'

export default function BroadcastPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchBroadcasts() {
    try {
      const res = await fetch(`/api/events/${eventId}/broadcast`)
      if (res.ok) {
        const data = await res.json()
        setBroadcasts(data.broadcasts || [])
      }
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBroadcasts()
  }, [eventId])

  async function handleSend(broadcastId: string) {
    if (!confirm('Send this broadcast to all confirmed guests?')) return
    try {
      const res = await fetch(`/api/events/${eventId}/broadcast/${broadcastId}/send`, {
        method: 'POST',
      })
      if (res.ok) {
        fetchBroadcasts()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send')
      }
    } catch {
      alert('Failed to send broadcast')
    }
  }

  async function handleDelete(broadcastId: string) {
    if (!confirm('Delete this draft broadcast?')) return
    try {
      await fetch(`/api/events/${eventId}/broadcast/${broadcastId}`, { method: 'DELETE' })
      fetchBroadcasts()
    } catch {
      alert('Failed to delete')
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
      <div>
        <h2 className="text-xl font-semibold text-[#1a1a2e] tracking-tight">Broadcast</h2>
        <p className="text-sm text-[#4a4a5e] mt-1">
          Send announcements to all confirmed guests for this event.
        </p>
      </div>

      <BroadcastComposer eventId={eventId} onSent={fetchBroadcasts} />
      <BroadcastHistoryList
        broadcasts={broadcasts}
        eventId={eventId}
        onSend={handleSend}
        onDelete={handleDelete}
      />
    </div>
  )
}
