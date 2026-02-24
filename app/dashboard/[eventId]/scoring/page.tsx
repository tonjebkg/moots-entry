'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Settings } from 'lucide-react'
import { ScoringDashboard } from '@/app/components/ScoringDashboard'
import { ScoreCard } from '@/app/components/ScoreCard'
import { ScoringJobProgress } from '@/app/components/ScoringJobProgress'

interface ScoredContact {
  contact_id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  company: string | null
  title: string | null
  score_id: string | null
  relevance_score: number | null
  matched_objectives: any[] | null
  score_rationale: string | null
  talking_points: string[] | null
  scored_at: string | null
}

interface Stats {
  total_contacts: number
  scored_count: number
  avg_score: number | null
  max_score: number | null
  min_score: number | null
}

export default function ScoringPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [contacts, setContacts] = useState<ScoredContact[]>([])
  const [stats, setStats] = useState<Stats>({ total_contacts: 0, scored_count: 0, avg_score: null, max_score: null, min_score: null })
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [minScoreFilter, setMinScoreFilter] = useState(0)

  const fetchScoring = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (minScoreFilter > 0) params.set('min_score', minScoreFilter.toString())

      const res = await fetch(`/api/events/${eventId}/scoring?${params}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts)
        setStats(data.stats)
        if (data.active_job) {
          setActiveJobId(data.active_job.id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch scoring:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId, minScoreFilter])

  useEffect(() => {
    fetchScoring()
  }, [fetchScoring])

  async function triggerScoring() {
    setTriggering(true)
    try {
      const res = await fetch(`/api/events/${eventId}/scoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        const data = await res.json()
        setActiveJobId(data.job_id)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to start scoring')
      }
    } catch (err) {
      console.error('Failed to trigger scoring:', err)
    } finally {
      setTriggering(false)
    }
  }

  const scoredContacts = contacts.filter(c => c.score_id !== null)
  const unscoredContacts = contacts.filter(c => c.score_id === null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-terracotta/10 flex items-center justify-center">
            <Sparkles size={20} className="text-brand-terracotta" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-brand-charcoal">AI Scoring</h1>
            <p className="text-sm text-ui-tertiary">
              Contacts ranked by relevance to event objectives
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${eventId}/objectives`}
            className="flex items-center gap-1.5 px-3 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream"
          >
            <Settings size={14} />
            Objectives
          </Link>
          <button
            onClick={triggerScoring}
            disabled={triggering || !!activeJobId}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta disabled:opacity-50"
          >
            <Sparkles size={14} />
            {triggering ? 'Starting...' : 'Score All Contacts'}
          </button>
        </div>
      </div>

      {/* Active Job Progress */}
      {activeJobId && (
        <ScoringJobProgress
          jobId={activeJobId}
          type="scoring"
          onComplete={() => {
            setActiveJobId(null)
            fetchScoring()
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-ui-tertiary">Loading scores...</div>
      ) : (
        <>
          {/* Stats */}
          <ScoringDashboard stats={stats} />

          {/* Filters */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-ui-tertiary">Min Score:</label>
            <input
              type="range"
              min={0}
              max={100}
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm font-mono text-ui-secondary">{minScoreFilter}</span>
          </div>

          {/* Scored Contacts */}
          {scoredContacts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-ui-tertiary uppercase tracking-wider">
                Ranked Contacts ({scoredContacts.length})
              </h2>
              {scoredContacts.map(c => (
                <ScoreCard
                  key={c.contact_id}
                  contactName={c.full_name}
                  company={c.company}
                  title={c.title}
                  photoUrl={c.photo_url}
                  score={c.relevance_score || 0}
                  rationale={c.score_rationale}
                  matchedObjectives={c.matched_objectives}
                  talkingPoints={c.talking_points}
                  scoredAt={c.scored_at}
                />
              ))}
            </div>
          )}

          {/* Unscored Contacts */}
          {unscoredContacts.length > 0 && minScoreFilter === 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-ui-tertiary uppercase tracking-wider">
                Not Yet Scored ({unscoredContacts.length})
              </h2>
              <div className="bg-white rounded-card shadow-card p-4">
                <div className="flex flex-wrap gap-2">
                  {unscoredContacts.slice(0, 20).map(c => (
                    <span key={c.contact_id} className="px-2 py-1 bg-brand-cream text-ui-secondary text-xs rounded-full">
                      {c.full_name}
                    </span>
                  ))}
                  {unscoredContacts.length > 20 && (
                    <span className="px-2 py-1 text-xs text-ui-tertiary">
                      +{unscoredContacts.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {contacts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-card shadow-card">
              <Sparkles size={32} className="mx-auto mb-3 text-ui-tertiary opacity-50" />
              <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-2">No contacts to score</h3>
              <p className="text-sm text-ui-tertiary mb-4">
                Add contacts to your People Database, then define event objectives to start scoring.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/dashboard/people" className="px-4 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream">
                  Go to People
                </Link>
                <Link href={`/dashboard/${eventId}/objectives`} className="px-5 py-2.5 bg-brand-terracotta text-white text-sm font-semibold rounded-pill hover:bg-brand-terracotta/90 shadow-cta">
                  Set Objectives
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
