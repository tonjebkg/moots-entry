'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Status = 'invited' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in'

type EventRow = {
  id: string
  name: string
  city: string | null
  starts_at: string | null
  timezone: string | null
  capacity: number | null
}

type Guest = {
  id: string
  event_id: string
  full_name: string
  email: string
  status: Status
  plus_ones: number | null
}

type SortKey = 'name' | 'status' | 'email' | 'plus_ones'

export default function CheckinPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router = useRouter()

  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  // UI state
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('status')

  // ---------- data load ----------
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)

      // Event (includes capacity)
      const { data: ev } = await supabase
        .from('events')
        .select('id,name,city,starts_at,timezone,capacity')
        .eq('id', eventId as string)
        .single()

      // Guests
      const { data: gs, error: gErr } = await supabase
        .from('guests')
        .select('id,event_id,full_name,email,status,plus_ones')
        .eq('event_id', eventId as string)
        .order('full_name', { ascending: true })

      if (!alive) return

      setEvent(ev ?? null)
      if (gErr) setMessage(`Failed to load guests: ${gErr.message}`)
      setGuests((gs ?? []).map(g => ({ ...g, plus_ones: g.plus_ones ?? 0 })))
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [eventId])

  // ---------- derived metrics ----------
  const {
    checkedInGuests, // number of guests (rows) checked-in
    notCheckedInGuests,
    checkedInHeadcount, // includes plus-ones
    capacity,
    progressPct,
    totalPlusOnesCheckedIn,
  } = useMemo(() => {
    const checked = guests.filter(g => g.status === 'checked_in')
    const notChecked = guests.length - checked.length
    const plus = checked.reduce((n, g) => n + Math.max(0, g.plus_ones ?? 0), 0)
    const headcount = checked.length + plus
    const cap = event?.capacity ?? null
    const pct =
      cap && cap > 0 ? Math.min(100, Math.round((headcount / cap) * 100)) : null
    return {
      checkedInGuests: checked.length,
      notCheckedInGuests: notChecked,
      checkedInHeadcount: headcount,
      capacity: cap,
      progressPct: pct,
      totalPlusOnesCheckedIn: plus,
    }
  }, [guests, event])

  // ---------- search & sort ----------
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let rows = needle
      ? guests.filter(
          g =>
            g.full_name.toLowerCase().includes(needle) ||
            g.email.toLowerCase().includes(needle)
        )
      : guests.slice()

    rows.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name)
        case 'email':
          return a.email.localeCompare(b.email)
        case 'plus_ones':
          return (b.plus_ones ?? 0) - (a.plus_ones ?? 0)
        case 'status':
        default: {
          // Put checked-in first, then alpha by name
          const ra = a.status === 'checked_in' ? 0 : 1
          const rb = b.status === 'checked_in' ? 0 : 1
          if (ra !== rb) return ra - rb
          return a.full_name.localeCompare(b.full_name)
        }
      }
    })

    return rows
  }, [guests, q, sortBy])

  // ---------- actions ----------
  function normalizeEmail(s: string) {
    return (s || '').trim().toLowerCase()
  }

  async function toggleCheckin(g: Guest) {
    // If not checked in -> check in. If checked in -> uncheck (go back to invited).
    const wasCheckedIn = g.status === 'checked_in'
    const next: Status = wasCheckedIn ? 'invited' : 'checked_in'

    // optimistic UI
    setGuests(prev =>
      prev.map(x => (x.id === g.id ? { ...x, status: next } : x))
    )

    // Update guest
    const { error: uErr } = await supabase
      .from('guests')
      .update({ status: next })
      .eq('id', g.id)
      .eq('event_id', g.event_id)

    if (uErr) {
      setMessage(`Failed to update: ${uErr.message}`)
      // revert
      setGuests(prev =>
        prev.map(x => (x.id === g.id ? { ...x, status: g.status } : x))
      )
      return
    }

    // keep checkins table in sync
    if (next === 'checked_in') {
      await supabase
        .from('checkins')
        .upsert(
          [
            {
              event_id: g.event_id,
              guest_id: g.id,
              checked_in_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'event_id,guest_id' }
        )
    } else if (wasCheckedIn && next !== g.status) {
      await supabase
        .from('checkins')
        .delete()
        .eq('event_id', g.event_id)
        .eq('guest_id', g.id)
    }
  }

  async function nudgePlusOnes(g: Guest, delta: number) {
    const current = Math.max(0, Number.isFinite(g.plus_ones) ? (g.plus_ones as number) : 0)
    const next = Math.max(0, current + delta)

    // optimistic
    setGuests(prev =>
      prev.map(x => (x.id === g.id ? { ...x, plus_ones: next } : x))
    )

    const { error } = await supabase
      .from('guests')
      .update({ plus_ones: next })
      .eq('id', g.id)
      .eq('event_id', g.event_id)

    if (error) {
      setMessage(`Failed to update plus-ones: ${error.message}`)
      // revert
      setGuests(prev =>
        prev.map(x => (x.id === g.id ? { ...x, plus_ones: current } : x))
      )
    }
  }

  // keyboard focus ( / )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const el = document.getElementById('search')
        if (el) {
          e.preventDefault()
          ;(el as HTMLInputElement).focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- UI ----------
  if (loading) {
    return <main className="p-6">Loading…</main>
  }
  if (!event) {
    return <main className="p-6">Event not found.</main>
  }

  const when =
    event.starts_at
      ? new Date(event.starts_at).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : ''

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {event.name || 'Event'}
          </h1>
          <p className="text-sm text-gray-400">
            {event.city ? `${event.city} • ` : ''}
            {when}
            {event.timezone ? ` • ${event.timezone}` : ''}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            className="px-4 py-2 rounded border hover:bg-gray-900"
            href={`/checkin/${event.id}/scan`}
          >
            Scan QR
          </Link>
          <Link
            className="px-4 py-2 rounded border hover:bg-gray-900"
            href={`/dashboard/${event.id}`}
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      {/* Counters row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric
          label="Checked-in headcount"
          value={checkedInHeadcount}
          hint={`(${checkedInGuests} guests + ${totalPlusOnesCheckedIn} plus-ones)`}
          tone="ok"
        />
        <Metric
          label="Not yet checked-in"
          value={notCheckedInGuests}
          hint={`${guests.length} total`}
        />
        <Metric
          label="Capacity"
          value={capacity ?? '—'}
          hint={capacity ? '' : 'No capacity set'}
        />
        <div className="rounded border px-3 py-2">
          <div className="text-xs text-gray-400 mb-1">Capacity usage</div>
          <div className="flex items-center gap-2">
            <div className="relative h-2 flex-1 rounded bg-gray-800 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-green-600"
                style={{ width: `${progressPct ?? 0}%` }}
              />
            </div>
            <div className="text-sm tabular-nums">
              {progressPct !== null ? `${progressPct}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <input
          id="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name or email…   (/ to focus)"
          className="w-full md:flex-1 p-2 rounded border bg-black"
        />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-sm text-gray-400">Sort:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="p-2 rounded border bg-black"
          >
            <option value="status">status</option>
            <option value="name">name</option>
            <option value="email">email</option>
            <option value="plus_ones">plus-ones</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220]">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th className="w-44">Status</Th>
              <Th className="w-40">Plus-ones</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map(g => (
              <tr key={g.id} className="border-t border-gray-800">
                <Td>{g.full_name}</Td>
                <Td className="text-gray-300">{normalizeEmail(g.email)}</Td>
                <Td>
                  {g.status === 'checked_in' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded bg-green-700/80 px-2 py-1 text-xs">
                        Checked-in
                      </span>
                      <button
                        onClick={() => toggleCheckin(g)}
                        className="px-2 py-1 rounded border hover:bg-gray-900"
                        title="Undo check-in"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleCheckin(g)}
                      className="px-3 py-1 rounded border hover:bg-gray-900"
                    >
                      Check in
                    </button>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => nudgePlusOnes(g, -1)}
                      className="w-7 h-7 rounded border hover:bg-gray-900"
                      aria-label="decrease plus-ones"
                    >
                      −
                    </button>
                    <span className="w-6 text-center tabular-nums">
                      {Math.max(0, g.plus_ones ?? 0)}
                    </span>
                    <button
                      onClick={() => nudgePlusOnes(g, +1)}
                      className="w-7 h-7 rounded border hover:bg-gray-900"
                      aria-label="increase plus-ones"
                    >
                      +
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <Td colSpan={4} className="text-center text-gray-400 py-6">
                  No guests match your search.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {message && (
        <div className="text-center text-red-400 text-sm">{message}</div>
      )}
    </main>
  )
}

/* ---------- tiny presentational helpers ---------- */
function Metric(props: {
  label: string
  value: number | string
  hint?: string
  tone?: 'ok' | 'warn' | 'err'
}) {
  const tone =
    props.tone === 'ok'
      ? 'text-green-400'
      : props.tone === 'warn'
      ? 'text-yellow-400'
      : props.tone === 'err'
      ? 'text-red-400'
      : 'text-white'
  return (
    <div className="rounded border px-3 py-2">
      <div className="text-xs text-gray-400">{props.label}</div>
      <div className={`text-lg font-medium ${tone}`}>{props.value}</div>
      {props.hint ? (
        <div className="text-xs text-gray-500">{props.hint}</div>
      ) : null}
    </div>
  )
}

function Th({
  children,
  className = '',
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th className={`text-left p-3 font-medium text-gray-300 ${className}`}>
      {children}
    </th>
  )
}
function Td({
  children,
  className = '',
  colSpan,
}: React.PropsWithChildren<{ className?: string; colSpan?: number }>) {
  return (
    <td className={`p-3 align-middle ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}
