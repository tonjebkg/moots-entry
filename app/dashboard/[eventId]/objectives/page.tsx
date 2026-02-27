'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Target, CheckCircle2, Sparkles } from 'lucide-react'
import { ObjectivesEditor } from '@/app/components/ObjectivesEditor'

interface Objective {
  id?: string
  objective_text: string
  weight: number
  criteria_config: Record<string, unknown>
  sort_order: number
  ai_interpretation?: string | null
  ai_questions?: string[] | null
  qualifying_count?: number
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

  const [savedCallout, setSavedCallout] = useState(false)

  const [scoringTriggered, setScoringTriggered] = useState(false)

  async function handleSave(updatedObjectives: Objective[]) {
    const res = await fetch(`/api/events/${eventId}/objectives`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectives: updatedObjectives }),
    })
    if (res.ok) {
      const data = await res.json()
      setObjectives(data.objectives)
      setSavedCallout(true)
      setTimeout(() => setSavedCallout(false), 8000)

      // Auto-trigger scoring when objectives change
      try {
        const scoreRes = await fetch(`/api/events/${eventId}/scoring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (scoreRes.ok) {
          setScoringTriggered(true)
          setTimeout(() => setScoringTriggered(false), 6000)
        }
      } catch {
        // Scoring trigger is best-effort — don't block the save
      }
    } else {
      throw new Error('Failed to save')
    }
  }

  return (
    <div>
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

      {savedCallout && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4 animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Objectives saved</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              {scoringTriggered
                ? 'AI scoring has been triggered automatically — contacts are being re-scored against your updated objectives.'
                : 'These will power AI scoring for all contacts in your pool.'}
            </p>
          </div>
        </div>
      )}

      {scoringTriggered && !savedCallout && (
        <div className="flex items-center gap-3 p-4 bg-brand-cream border border-brand-terracotta/20 rounded-lg mb-4 animate-fade-in">
          <Sparkles size={16} className="text-brand-terracotta shrink-0 animate-pulse" />
          <p className="text-sm font-medium text-brand-charcoal">
            Scoring contacts against your updated objectives...
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-ui-tertiary">Loading objectives...</div>
      ) : (
        <ObjectivesEditor
          eventId={eventId}
          objectives={objectives}
          onSave={handleSave}
          hasScoredContacts={objectives.some(o => o.qualifying_count !== undefined)}
        />
      )}
    </div>
  )
}
