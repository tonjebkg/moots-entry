'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Status = 'invite_sent' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in'

type Guest = {
  id: string
  event_id: string
  full_name: string
  email: string
  status: Status
  plus_ones: number | null
}

type EventRow = {
  id: string
  name: string
  city: string | null
  starts_at: string
  timezone: string | null
  capacity: number | null
}

export default function CheckinPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'status' | 'name'>('status')
  const [message, setMessage] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!eventId) return
    ;(async () => {
      const { data: ev } = await supabase
        .from('events')
        .select('id,name,city,starts_at,timezone,capacity')
        .eq('id', eventId)
        .single()
      setEvent(ev)

      const { data: gs } = await supabase
        .from('guests')
        .select('id,event_id,full_name,email,status,plus_ones')
        .eq('event_id', eventId)
        .order('full_name', { ascending: true })
      setGuests(gs ?? [])
    })()
  }, [eventId])

  const metrics = useMemo(() => {
    const hc = (g: Guest) => 1 + Math.max(0, g.plus_ones ?? 0)
    let checkedIn = 0
    let confirmed = 0
    for (const g of guests) {
      if (g.status === 'checked_in') checkedIn += hc(g)
      if (g.status === 'confirmed') confirmed += hc(g)
    }
    return {
      checkedInHeadcount: checkedIn,
      confirmedHeadcount: confirmed,
      notYetCheckedInHeadcount: Math.max(0, confirmed - checkedIn),
    }
  }, [guests])

  const capacity = event?.capacity ?? 0
  const capacityPct = capacity ? Math.min(100, (metrics.checkedInHeadcount / capacity) * 100) : 0

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = term
      ? guests.filter(g => g.full_name.toLowerCase().includes(term) || g.email.toLowerCase().includes(term))
      : [...guests]
    if (sortKey === 'status') {
      const order: Record<Status, number> = { checked_in:0, confirmed:1, invite_sent:2, waitlist:3, cancelled:4 }
      list.sort((a,b)=> order[a.status]-order[b.status] || a.full_name.localeCompare(b.full_name))
    } else {
      list.sort((a,b)=> a.full_name.localeCompare(b.full_name))
    }
    return list
  }, [guests, q, sortKey])

  async function setStatus(g: Guest, status: Status) {
    await supabase.from('guests').update({ status }).eq('id', g.id)
    setGuests(prev => prev.map(x => x.id===g.id ? { ...x, status } : x))
  }
  async function handleCheckIn(g: Guest) {
    if (g.status !== 'checked_in') await setStatus(g, 'checked_in')
  }
  async function handleUndo(g: Guest) {
    if (g.status === 'checked_in') await setStatus(g, 'invite_sent')
  }
  async function handlePlusOnes(g: Guest, delta: 1 | -1) {
    const next = Math.max(0, (g.plus_ones ?? 0) + delta)
    await supabase.from('guests').update({ plus_ones: next }).eq('id', g.id)
    setGuests(prev => prev.map(x => x.id===g.id ? { ...x, plus_ones: next } : x))
  }

  if (!event) return <main className="p-6 text-white">Loading…</main>

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{event.name}</h1>
          <p className="text-sm text-slate-400">
            {event.city ?? '—'} • {new Date(event.starts_at).toLocaleString()} • {event.timezone ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/checkin/${event.id}/scan`} className="px-4 py-2 rounded border hover:bg-slate-900">Scan QR</Link>
          <Link href={`/dashboard/${event.id}`} className="px-4 py-2 rounded border hover:bg-slate-900">Back to dashboard</Link>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="border rounded p-4">
          <div className="text-slate-400 text-sm">Checked-in headcount</div>
          <div className="text-2xl font-semibold mt-1">{metrics.checkedInHeadcount}</div>
          <div className="text-xs text-slate-400 mt-1">(guests + plus-ones)</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-slate-400 text-sm">Not yet checked-in</div>
          <div className="text-2xl font-semibold mt-1">{metrics.notYetCheckedInHeadcount}</div>
          <div className="text-xs text-slate-400 mt-1">(guests + plus-ones)</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-slate-400 text-sm">Confirmed guests</div>
          <div className="text-2xl font-semibold mt-1">{metrics.confirmedHeadcount}</div>
          <div className="text-xs text-slate-400 mt-1">(guests + plus-ones)</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-slate-400 text-sm">Event capacity {capacity ? `${capacity} guests` : ''}</div>
          <div className="mt-2 h-2 w-full bg-slate-800 rounded overflow-hidden">
            <div className="h-full bg-green-600" style={{ width: `${capacityPct}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{Math.round(capacityPct)}%</div>
        </div>
      </section>

      <section className="flex gap-3 items-center">
        <input ref={searchRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email…  (/ to focus)" className="flex-1 p-2 rounded border bg-transparent" />
        <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="p-2 rounded border bg-transparent">
          <option value="status">status</option>
          <option value="name">name</option>
        </select>
      </section>

      <section className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Plus-ones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={4} className="p-4 text-center text-slate-400">No guests found.</td></tr>
            )}
            {filtered.map(g=>(
              <tr key={g.id} className="border-t border-slate-800">
                <td className="p-2">{g.full_name}</td>
                <td className="p-2">{g.email}</td>
                <td className="p-2">
                  {g.status === 'checked_in' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 rounded bg-green-700 text-white">Checked-in</span>
                      <button className="px-3 py-1 rounded border hover:bg-slate-900" onClick={()=>handleUndo(g)}>Undo</button>
                    </div>
                  ) : (
                    <button className="px-3 py-1 rounded border hover:bg-slate-900" onClick={()=>handleCheckIn(g)}>Check in</button>
                  )}
                </td>
                <td className="p-2">
                  <div className="inline-flex items-center gap-2">
                    <button className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>handlePlusOnes(g,-1)}>−</button>
                    <span>{g.plus_ones ?? 0}</span>
                    <button className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>handlePlusOnes(g,+1)}>＋</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {message && <p className="text-center text-sm text-amber-300">{message}</p>}
    </main>
  )
}
