'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Target } from 'lucide-react'
import { EventTabNavigation } from '@/app/components/EventTabNavigation'
import { ObjectivesEditor } from '@/app/components/ObjectivesEditor'

interface Objective {
  id?: string
  objective_text: string
  weight: number
  criteria_config: Record<string, unknown>
  sort_order: number
}

export default function ObjectivesPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [eventTitle, setEventTitle] = useState('')

  useEffect(() => {
    fetchObjectives()
    fetchEvent()
  }, [eventId])

  async function fetchObjectives() {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/objectives`)
      if (res.ok) {
        const data = await res.json()
        setObjectives(data.objectives)
      }
    } catch (err) {
      console.error('Failed to fetch objectives:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events/${eventId}`)
      if (res.ok) {
        const data = await res.json()
        setEventTitle(data.title || data.name || 'Event')
      }
    } catch {}
  }

  async function handleSave(updatedObjectives: Objective[]) {
    const res = await fetch(`/api/events/${eventId}/objectives`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectives: updatedObjectives }),
    })
    if (res.ok) {
      const data = await res.json()
      setObjectives(data.objectives)
    } else {
      throw new Error('Failed to save')
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      <header className="fixed top-0 left-0 right-0 bg-white/98 backdrop-blur-sm border-b border-[#e1e4e8] z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center gap-8">
          <Link href="/dashboard" className="text-2xl font-bold text-[#1a1a2e]">Moots</Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-[#6e6e7e] hover:text-[#1a1a2e]">Events</Link>
            <Link href="/dashboard/people" className="text-sm font-medium text-[#6e6e7e] hover:text-[#1a1a2e]">People</Link>
          </nav>
        </div>
      </header>

      <div className="pt-[73px]">
        <div className="max-w-7xl mx-auto px-8">
          {/* Event Header */}
          <div className="py-6 border-b border-[#e1e4e8]">
            <Link href={`/dashboard/${eventId}`} className="inline-flex items-center gap-1.5 text-sm text-[#6e6e7e] hover:text-[#0f3460] mb-2">
              <ArrowLeft size={14} />
              {eventTitle}
            </Link>
            <EventTabNavigation eventId={eventId} />
          </div>

          {/* Content */}
          <div className="py-8 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#0f3460]/10 flex items-center justify-center">
                <Target size={20} className="text-[#0f3460]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1a1a2e]">Event Objectives</h1>
                <p className="text-sm text-[#6e6e7e]">
                  Define what makes a guest ideal for this event. The AI scoring engine uses these objectives.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-[#6e6e7e]">Loading objectives...</div>
            ) : (
              <ObjectivesEditor
                eventId={eventId}
                objectives={objectives}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
