'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Settings } from 'lucide-react'
import { EventTabNavigation } from '@/app/components/EventTabNavigation'
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
  const [eventTitle, setEventTitle] = useState('')
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
    fetch(`/api/events/${eventId}`)
      .then(r => r.json())
      .then(data => setEventTitle(data.title || data.name || 'Event'))
      .catch(() => {})
  }, [fetchScoring, eventId])

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
          <div className="py-6 border-b border-[#e1e4e8]">
            <Link href={`/dashboard/${eventId}`} className="inline-flex items-center gap-1.5 text-sm text-[#6e6e7e] hover:text-[#0f3460] mb-2">
              <ArrowLeft size={14} />
              {eventTitle}
            </Link>
            <EventTabNavigation eventId={eventId} />
          </div>

          <div className="py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0f3460]/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-[#0f3460]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1a1a2e]">AI Scoring</h1>
                  <p className="text-sm text-[#6e6e7e]">
                    Contacts ranked by relevance to event objectives
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/${eventId}/objectives`}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm font-medium text-[#4a4a5e] hover:bg-[#f8f9fa]"
                >
                  <Settings size={14} />
                  Objectives
                </Link>
                <button
                  onClick={triggerScoring}
                  disabled={triggering || !!activeJobId}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
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
              <div className="text-center py-12 text-[#6e6e7e]">Loading scores...</div>
            ) : (
              <>
                {/* Stats */}
                <ScoringDashboard stats={stats} />

                {/* Filters */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-[#6e6e7e]">Min Score:</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
                    className="w-32 accent-[#0f3460]"
                  />
                  <span className="text-sm font-mono text-[#4a4a5e]">{minScoreFilter}</span>
                </div>

                {/* Scored Contacts */}
                {scoredContacts.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-[#6e6e7e] uppercase tracking-wider">
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
                    <h2 className="text-sm font-semibold text-[#6e6e7e] uppercase tracking-wider">
                      Not Yet Scored ({unscoredContacts.length})
                    </h2>
                    <div className="bg-white border border-[#e1e4e8] rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {unscoredContacts.slice(0, 20).map(c => (
                          <span key={c.contact_id} className="px-2 py-1 bg-[#f0f2f5] text-[#4a4a5e] text-xs rounded-full">
                            {c.full_name}
                          </span>
                        ))}
                        {unscoredContacts.length > 20 && (
                          <span className="px-2 py-1 text-xs text-[#6e6e7e]">
                            +{unscoredContacts.length - 20} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {contacts.length === 0 && (
                  <div className="text-center py-12 bg-white border border-[#e1e4e8] rounded-lg">
                    <Sparkles size={32} className="mx-auto mb-3 text-[#6e6e7e] opacity-50" />
                    <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">No contacts to score</h3>
                    <p className="text-sm text-[#6e6e7e] mb-4">
                      Add contacts to your People Database, then define event objectives to start scoring.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Link href="/dashboard/people" className="px-4 py-2 border border-[#e1e4e8] rounded-lg text-sm font-medium text-[#4a4a5e] hover:bg-[#f8f9fa]">
                        Go to People
                      </Link>
                      <Link href={`/dashboard/${eventId}/objectives`} className="px-4 py-2 bg-[#0f3460] text-white text-sm font-semibold rounded-lg hover:bg-[#c5a572]">
                        Set Objectives
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
