'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Target } from 'lucide-react'
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

  useEffect(() => {
    fetchObjectives()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-brand-forest/10 flex items-center justify-center">
          <Target size={20} className="text-brand-forest" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-brand-charcoal">Event Objectives</h1>
          <p className="text-sm text-ui-tertiary">
            Define what makes a guest ideal for this event. The AI scoring engine uses these objectives.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-ui-tertiary">Loading objectives...</div>
      ) : (
        <ObjectivesEditor
          eventId={eventId}
          objectives={objectives}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
