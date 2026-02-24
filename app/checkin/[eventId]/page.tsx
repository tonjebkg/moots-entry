'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Status = 'invite_sent' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in'
type Priority = 'normal' | 'vip' | 'vvip'

type Guest = {
  id: string
  event_id: string
  full_name: string
  email: string
  status: Status
  plus_ones: number | null
  priority?: Priority | null
  comments?: string | null
  checked_in_at?: string | null // ISO
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
  // Guard: Skip Supabase usage when in dashboard mode
  if (process.env.NEXT_PUBLIC_APP_MODE === 'dashboard') {
    return <main className="p-6 text-white">Check-in page not available in dashboard mode</main>
  }

  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'status' | 'name' | 'priority' | 'checked_in_at'>('status')
  const [message, setMessage] = useState<string | null>(null)

  // add guest inline form
  const [isAdding, setIsAdding] = useState(false)
  const [newGuest, setNewGuest] = useState<{
    full_name: string
    email: string
    plus_ones: number
    priority: Priority
    comments: string
  }>({ full_name: '', email: '', plus_ones: 0, priority: 'normal', comments: '' })

  // comments modal
  const [commentGuest, setCommentGuest] = useState<Guest | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

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
        .select('id,event_id,full_name,email,status,plus_ones,priority,comments,checked_in_at')
        .eq('event_id', eventId)
        .order('full_name', { ascending: true })
      setGuests((gs ?? []).map((g: any) => ({
        ...g,
        priority: (g.priority as Priority) ?? 'normal',
        comments: g.comments ?? '',
      })))
    })()
  }, [eventId])

  // ----- metrics -----
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

  // ----- filter/sort -----
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = term
      ? guests.filter(g =>
          g.full_name.toLowerCase().includes(term) ||
          g.email.toLowerCase().includes(term) ||
          (g.comments ?? '').toLowerCase().includes(term)
        )
      : [...guests]

    if (sortKey === 'status') {
      const order: Record<Status, number> = { checked_in:0, confirmed:1, invite_sent:2, waitlist:3, cancelled:4 }
      list.sort((a,b)=> order[a.status]-order[b.status] || a.full_name.localeCompare(b.full_name))
    } else if (sortKey === 'name') {
      list.sort((a,b)=> a.full_name.localeCompare(b.full_name))
    } else if (sortKey === 'priority') {
      const order: Record<Priority, number> = { vvip:0, vip:1, normal:2 }
      list.sort((a,b)=> (order[(a.priority??'normal')] - order[(b.priority??'normal')]) || a.full_name.localeCompare(b.full_name))
    } else if (sortKey === 'checked_in_at') {
      list.sort((a,b)=> {
        const ta = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0
        const tb = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0
        return tb - ta // latest first
      })
    }
    return list
  }, [guests, q, sortKey])

  // ----- mutations -----
  async function setStatus(g: Guest, status: Status) {
    const patch: any = { status }
    if (status === 'checked_in') patch.checked_in_at = new Date().toISOString()
    if (g.status === 'checked_in' && status !== 'checked_in') patch.checked_in_at = null
    await supabase.from('guests').update(patch).eq('id', g.id)
    setGuests(prev => prev.map(x => x.id===g.id ? { ...x, ...patch } : x))
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
  async function handlePriorityChange(g: Guest, next: Priority) {
    await supabase.from('guests').update({ priority: next }).eq('id', g.id)
    setGuests(prev => prev.map(x => x.id===g.id ? { ...x, priority: next } : x))
  }

  // comments modal
  function openCommentModal(g: Guest){ setCommentGuest(g); setCommentDraft(g.comments ?? '') }
  function closeCommentModal(){ setCommentGuest(null); setCommentDraft('') }
  async function saveCommentModal(){
    if (!commentGuest) return
    await supabase.from('guests').update({ comments: commentDraft }).eq('id', commentGuest.id)
    setGuests(prev => prev.map(x => x.id===commentGuest.id ? { ...x, comments: commentDraft } : x))
    closeCommentModal()
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!commentGuest) return
      if (e.key === 'Escape') { e.preventDefault(); closeCommentModal() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveCommentModal() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commentGuest, commentDraft])

  // add guest inline (defaults to checked-in)
  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    const payload = {
      event_id: event.id,
      full_name: newGuest.full_name.trim(),
      email: newGuest.email.trim(),
      status: 'checked_in' as Status,
      plus_ones: Math.max(0, newGuest.plus_ones),
      priority: newGuest.priority,
      comments: newGuest.comments.trim(),
      checked_in_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('guests')
      .insert([payload])
      .select('id,event_id,full_name,email,status,plus_ones,priority,comments,checked_in_at')
      .single()
    if (error) { setMessage(error.message); return }
    setGuests(prev => [...prev, data as Guest])
    setIsAdding(false)
    setNewGuest({ full_name:'', email:'', plus_ones:0, priority:'normal', comments:'' })
    setMessage('Guest added & checked-in.')
  }

  if (!event) return <main className="p-6 text-white">Loading…</main>

  const capacityLabel = capacity ? `${capacity} guests` : ''

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      {/* HEADER */}
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

      {/* METRICS */}
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
          <div className="text-slate-400 text-sm">Event capacity {capacityLabel}</div>
          <div className="mt-2 h-2 w-full bg-slate-800 rounded overflow-hidden">
            <div className="h-full bg-green-600" style={{ width: `${capacityPct}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{Math.round(capacityPct)}%</div>
        </div>
      </section>

      {/* ADD GUEST (check-in context) */}
      <section className="flex items-center justify-between">
        <button className="px-3 py-2 rounded border hover:bg-slate-900" onClick={() => setIsAdding(v=>!v)}>
          {isAdding ? 'Cancel' : 'Add guest (checked-in)'}
        </button>
      </section>

      {isAdding && (
        <form onSubmit={handleCreateGuest} className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border rounded bg-slate-900/30">
          <input required value={newGuest.full_name} onChange={e=>setNewGuest(s=>({...s,full_name:e.target.value}))} placeholder="Full name" className="p-2 rounded border bg-transparent md:col-span-2" />
          <input required type="email" value={newGuest.email} onChange={e=>setNewGuest(s=>({...s,email:e.target.value}))} placeholder="Email" className="p-2 rounded border bg-transparent md:col-span-2" />
          <select value={newGuest.priority} onChange={e=>setNewGuest(s=>({...s,priority:e.target.value as Priority}))} className="p-2 rounded border bg-transparent">
            <option value="normal">Normal</option>
            <option value="vip">VIP</option>
            <option value="vvip">VVIP</option>
          </select>
          <div className="flex items-center gap-2 md:col-span-2">
            <label className="text-sm text-slate-300">Plus-ones</label>
            <button type="button" className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>setNewGuest(s=>({...s,plus_ones: Math.max(0,s.plus_ones-1)}))}>−</button>
            <span className="min-w-6 text-center">{newGuest.plus_ones}</span>
            <button type="button" className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>setNewGuest(s=>({...s,plus_ones: s.plus_ones+1}))}>＋</button>
          </div>
          <input value={newGuest.comments} onChange={e=>setNewGuest(s=>({...s,comments:e.target.value}))} placeholder="Comments (e.g., invited by …)" className="p-2 rounded border bg-transparent md:col-span-4" />
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-3 py-2 rounded border bg-blue-700 hover:bg-blue-600">Save & check in</button>
          </div>
        </form>
      )}

      {/* CONTROLS */}
      <section className="flex gap-3 items-center">
        <input ref={searchRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, email, or note…  (/ to focus)" className="flex-1 p-2 rounded border bg-transparent" />
        <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="p-2 rounded border bg-transparent">
          <option value="status">status</option>
          <option value="name">name</option>
          <option value="priority">priority</option>
          <option value="checked_in_at">time</option>
        </select>
      </section>

      {/* TABLE */}
      <section className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Priority</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Plus-ones</th>
              <th className="text-left p-2">Comments</th>
              <th className="text-left p-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={7} className="p-4 text-center text-slate-400">No guests found.</td></tr>
            )}
            {filtered.map(g=>(
              <tr key={g.id} className="border-t border-slate-800">
                <td className="p-2">{g.full_name}</td>
                <td className="p-2">{g.email}</td>

                {/* Priority */}
                <td className="p-2">
                  <select
                    value={(g.priority ?? 'normal') as Priority}
                    onChange={e => handlePriorityChange(g, e.target.value as Priority)}
                    className="px-2 py-1 rounded border bg-transparent"
                  >
                    <option value="normal">Normal</option>
                    <option value="vip">VIP</option>
                    <option value="vvip">VVIP</option>
                  </select>
                </td>

                {/* Status */}
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

                {/* Plus-ones */}
                <td className="p-2">
                  <div className="inline-flex items-center gap-2">
                    <button className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>handlePlusOnes(g,-1)}>−</button>
                    <span>{g.plus_ones ?? 0}</span>
                    <button className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>handlePlusOnes(g,+1)}>＋</button>
                  </div>
                </td>

                {/* Comments (readable via modal) */}
                <td className="p-2">
                  <input
                    value={g.comments ?? ''}
                    readOnly
                    onClick={() => openCommentModal(g)}
                    placeholder="Add a note…"
                    className="w-full p-1 rounded border bg-transparent cursor-pointer"
                    title={g.comments ?? ''}
                  />
                </td>

                {/* Time */}
                <td className="p-2">
                  {g.checked_in_at ? new Date(g.checked_in_at).toLocaleTimeString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Comments Modal */}
      {commentGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeCommentModal} />
          <div className="relative z-10 w-[min(800px,92vw)] max-h-[88vh] bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Edit note — {commentGuest.full_name}</h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeCommentModal}>Close (Esc)</button>
            </div>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={10}
              className="w-full p-3 rounded border bg-transparent resize-y"
              placeholder="Type your note…"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={closeCommentModal}>Cancel</button>
              <button className="px-3 py-2 rounded border bg-blue-700 hover:bg-blue-600" onClick={saveCommentModal} title="Save (⌘/Ctrl + Enter)">Save</button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="text-center text-sm text-amber-300">{message}</p>}
    </main>
  )
}
