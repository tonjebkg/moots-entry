'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ApproveMode = 'MANUAL' | 'AUTO'
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETE' | 'CANCELLED'

type Location = {
  venue_name?: string
  street_address?: string
  city?: string
  state_province?: string
  country?: string
}

type Host = { name: string; url?: string | null }
type Sponsor = {
  title: string
  subtitle?: string
  logo_url?: string
  description?: string
}

type EventRow = {
  id: string | number
  title: string
  location?: Location | string | null
  start_date: string
  end_date?: string
  timezone: string | null
  capacity: number | null
  image_url?: string | null
  event_url?: string | null
  hosts?: Host[] | null
  sponsors?: Sponsor[] | null
  is_private?: boolean
  approve_mode?: ApproveMode
  status?: EventStatus
  created_at?: string
  updated_at?: string
  // Legacy fields
  name?: string
  city?: string | null
  starts_at?: string
}

const STATUS_BG: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-600 text-slate-200',
  PUBLISHED: 'bg-green-700 text-white',
  COMPLETE: 'bg-blue-700 text-white',
  CANCELLED: 'bg-red-700 text-white',
}

export default function DashboardHomePage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/events')
        if (!res.ok) throw new Error('Failed to fetch events')
        const data = await res.json()
        if (cancelled) return
        setEvents(data.events || [])
      } catch (err: any) {
        if (cancelled) return
        console.error('Failed to load events:', err)
        setError(err.message || 'Failed to load events')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  const filtered = q.trim()
    ? events.filter(e => {
        const term = q.toLowerCase()
        const locationStr = typeof e.location === 'object'
          ? (e.location?.city ?? '')
          : (e.location ?? e.city ?? '')
        return (
          (e.title ?? e.name ?? '').toLowerCase().includes(term) ||
          locationStr.toLowerCase().includes(term) ||
          (e.event_url ?? '').toLowerCase().includes(term)
        )
      })
    : events

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-400">Loading events...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold">Error</h1>
          <p className="text-red-400">{error}</p>
          <Link href="/" className="text-blue-400 underline">
            Return home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Events Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Manage all events - {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        </header>

        {/* Search */}
        <section className="flex gap-3 items-center">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by title, city, or URL..."
            className="flex-1 p-2 rounded border border-slate-700 bg-transparent focus:outline-none focus:border-slate-500"
          />
        </section>

        {/* Events Table */}
        <section className="border border-slate-800 rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-200">
              <tr>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Approve Mode</th>
                <th className="text-left p-2">Private</th>
                <th className="text-left p-2">Start Date</th>
                <th className="text-left p-2">End Date</th>
                <th className="text-left p-2">Location</th>
                <th className="text-left p-2">Hosts</th>
                <th className="text-left p-2">Sponsors</th>
                <th className="text-left p-2">Capacity</th>
                <th className="text-left p-2">Created</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-4 text-center text-slate-400">
                    {q.trim() ? 'No events match your search.' : 'No events yet.'}
                  </td>
                </tr>
              )}
              {filtered.map(event => {
                const locationDisplay = typeof event.location === 'object'
                  ? [event.location?.city, event.location?.state_province, event.location?.country].filter(Boolean).join(', ')
                  : event.location || event.city || '—'
                const hostsDisplay = Array.isArray(event.hosts) && event.hosts.length > 0
                  ? event.hosts.map(h => h.name).join(', ')
                  : '—'
                const sponsorsDisplay = Array.isArray(event.sponsors) && event.sponsors.length > 0
                  ? event.sponsors.map(s => s.title).join(', ')
                  : '—'

                return (
                  <tr key={event.id} className="border-t border-slate-800 hover:bg-slate-900/30">
                    <td className="p-2 text-slate-400 font-mono text-xs">{event.id}</td>
                    <td className="p-2">
                      <Link
                        href={`/dashboard/${event.id}`}
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        {event.title ?? event.name}
                      </Link>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_BG[event.status ?? 'DRAFT']}`}>
                        {event.status ?? 'DRAFT'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-300">{event.approve_mode ?? 'MANUAL'}</td>
                    <td className="p-2 text-center">
                      {event.is_private ? (
                        <span className="text-amber-400">🔒</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-2 text-slate-300 text-xs">
                      {new Date(event.start_date ?? event.starts_at ?? '').toLocaleString()}
                    </td>
                    <td className="p-2 text-slate-300 text-xs">
                      {event.end_date ? new Date(event.end_date).toLocaleString() : '—'}
                    </td>
                    <td className="p-2 text-slate-300 max-w-xs truncate" title={locationDisplay}>
                      {locationDisplay}
                    </td>
                    <td className="p-2 text-slate-300 max-w-xs truncate" title={hostsDisplay}>
                      {hostsDisplay}
                    </td>
                    <td className="p-2 text-slate-300 max-w-xs truncate" title={sponsorsDisplay}>
                      {sponsorsDisplay}
                    </td>
                    <td className="p-2 text-slate-300">{event.capacity ?? '—'}</td>
                    <td className="p-2 text-slate-400 text-xs">
                      {event.created_at ? new Date(event.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/dashboard/${event.id}`}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <footer className="text-center text-sm text-slate-500 pt-8">
          <p>Moots Dashboard • Neon-backed event operations</p>
        </footer>
      </div>
    </main>
  )
}
