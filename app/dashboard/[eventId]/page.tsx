'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' // Still needed for image uploads only

// Neon status enum values
type NeonStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DRAFT'
type Priority = 'normal' | 'vip' | 'vvip'

type Guest = {
  id: string
  event_id: string | number
  full_name: string
  email: string
  status: NeonStatus
  plus_ones: number | null
  priority?: Priority | null
  comments?: string | null
  owner_id?: string
  photo_url?: string | null
}

type Host = { name: string; url?: string | null }

type EventRow = {
  id: string
  name: string
  city: string | null
  starts_at: string
  timezone: string | null
  capacity: number | null
  image_url?: string | null
  event_url?: string | null
  hosts?: Host[] | null
  edit_token?: string // used by /api/events/update
}

const STATUS_LABEL: Record<NeonStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
}
const STATUS_BG: Record<NeonStatus, string> = {
  PENDING: 'bg-amber-700 text-white',
  APPROVED: 'bg-blue-700 text-white',
  REJECTED: 'bg-red-700 text-white',
  CANCELLED: 'bg-slate-700 text-slate-100',
  DRAFT: 'bg-slate-600 text-slate-200',
}
const PRIORITY_LABEL: Record<Priority, string> = {
  normal: 'Normal',
  vip: 'VIP',
  vvip: 'VVIP',
}

function formatLocalDDMMYYYYHHMM(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function parseFlexibleToISO(input: string): string | null {
  if (!input) return null
  const s = input.trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?$/)
  if (m) {
    const dd = Number(m[1])
    const mm = Number(m[2]) - 1
    const yyyy = Number(m[3])
    const hh = m[4] ? Number(m[4]) : 0
    const min = m[5] ? Number(m[5]) : 0
    const d = new Date(yyyy, mm, dd, hh, min, 0, 0)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export default function DashboardPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'priority' | 'plus_ones'>('name')
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Edit event modal state
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [evName, setEvName] = useState('')
  const [evCity, setEvCity] = useState('')
  const [evTimezone, setEvTimezone] = useState('')
  const [evStartsAtInput, setEvStartsAtInput] = useState('')
  const [evCapacity, setEvCapacity] = useState<number>(0)
  const [evEventUrl, setEvEventUrl] = useState('')
  const [evImageUrl, setEvImageUrl] = useState<string>('')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [hosts, setHosts] = useState<Host[]>([])
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Comments modal
  const [commentGuest, setCommentGuest] = useState<Guest | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  const [newGuest, setNewGuest] = useState<{
    full_name: string
    email: string
    status: NeonStatus
    plus_ones: number
    priority: Priority
    comments: string
  }>({ full_name: '', email: '', status: 'PENDING', plus_ones: 0, priority: 'normal', comments: '' })

  useEffect(() => {
    if (!eventId) return

    let cancelled = false

    ;(async () => {
      try {
        // Fetch event from Neon API
        const eventRes = await fetch(`/api/events/${eventId}`)
        if (!eventRes.ok) {
          const errorText = await eventRes.text()
          console.error('Failed to fetch event:', errorText)
          if (!cancelled) {
            setMessage(`Failed to load event: ${eventRes.status}`)
          }
          return
        }

        const eventData = await eventRes.json()
        if (!cancelled) {
          setEvent(eventData)
        }

        // Fetch join requests from Neon API
        const joinReqRes = await fetch(`/api/events/${eventId}/join-requests`)
        if (joinReqRes.ok) {
          const joinReqData = await joinReqRes.json()
          if (!cancelled) {
            setGuests(joinReqData.join_requests ?? [])
          }
        } else {
          const errorText = await joinReqRes.text()
          console.error('Failed to fetch join requests:', errorText)
          if (!cancelled) {
            setMessage(`Failed to load join requests: ${joinReqRes.status}`)
          }
        }
      } catch (err: any) {
        console.error('Error loading dashboard data:', err)
        if (!cancelled) {
          setMessage(`Error: ${err.message || 'Failed to load dashboard'}`)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [eventId])

  const totals = useMemo(() => {
    const base = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0, DRAFT: 0 }
    let totalHeadcount = 0
    for (const g of guests) {
      const plus = Math.max(0, g.plus_ones ?? 0)
      const hc = 1 + plus
      totalHeadcount += hc
      base[g.status] = (base[g.status] || 0) + hc
    }
    return {
      ...base,
      totalHeadcount,
      confirmedHeadcount: base.APPROVED, // APPROVED = confirmed attendees
    }
  }, [guests])

  const capacity = event?.capacity ?? 0
  const confirmedPct = capacity ? Math.min(100, (totals.confirmedHeadcount / capacity) * 100) : 0

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = term
      ? guests.filter(g =>
          g.full_name.toLowerCase().includes(term) ||
          g.email.toLowerCase().includes(term)
        )
      : [...guests]
    switch (sortKey) {
      case 'status':
        list.sort((a,b)=>STATUS_LABEL[a.status].localeCompare(STATUS_LABEL[b.status])); break
      case 'priority': {
        const order: Record<Priority,number> = { vvip:0, vip:1, normal:2 }
        list.sort((a,b)=> (order[(a.priority??'normal')] - order[(b.priority??'normal')]) || a.full_name.localeCompare(b.full_name))
        break
      }
      case 'plus_ones': list.sort((a,b)=>(b.plus_ones??0)-(a.plus_ones??0)); break
      default: list.sort((a,b)=>a.full_name.localeCompare(b.full_name))
    }
    return list
  }, [guests, q, sortKey])

  async function handleStatusChange(g: Guest, next: NeonStatus) {
    const res = await fetch(`/api/join-requests/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next })
    })
    if (res.ok) {
      setGuests(prev => prev.map(x => x.id === g.id ? { ...x, status: next } : x))
    } else {
      console.error('Failed to update status:', await res.text())
    }
  }
  async function handlePriorityChange(g: Guest, next: Priority) {
    // Priority is not stored in Neon event_join_requests - this is a no-op for Phase 1
    console.log('Priority change not supported in Phase 1:', g.id, next)
  }
  async function handlePlusOnes(g: Guest, delta: 1 | -1) {
    const next = Math.max(0, (g.plus_ones ?? 0) + delta)
    const res = await fetch(`/api/join-requests/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plus_ones: next })
    })
    if (res.ok) {
      setGuests(prev => prev.map(x => x.id===g.id ? { ...x, plus_ones: next } : x))
    } else {
      console.error('Failed to update plus_ones:', await res.text())
    }
  }

  // comments modal
  function closeCommentModal() { setCommentGuest(null); setCommentDraft('') }
  async function saveCommentModal() {
    if (!commentGuest) return
    const res = await fetch(`/api/join-requests/${commentGuest.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: commentDraft })
    })
    if (res.ok) {
      setGuests(prev => prev.map(x => x.id === commentGuest.id ? { ...x, comments: commentDraft } : x))
      closeCommentModal()
    } else {
      console.error('Failed to update comments:', await res.text())
    }
  }

  // add guest
  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    const payload = {
      event_id: event.id,
      full_name: newGuest.full_name.trim(),
      email: newGuest.email.trim(),
      status: newGuest.status,
      plus_ones: Math.max(0, newGuest.plus_ones),
      priority: newGuest.priority,
      comments: newGuest.comments.trim(),
    }
    const { data, error } = await supabase
      .from('guests')
      .insert([payload])
      .select('id,event_id,full_name,email,status,plus_ones,priority,comments')
      .single()
    if (error) { setMessage(error.message); return }
    setGuests(prev => [...prev, data as Guest].sort((a,b)=>a.full_name.localeCompare(b.full_name)))
    setIsAdding(false)
    setNewGuest({ full_name:'', email:'', status:'PENDING', plus_ones:0, priority:'normal', comments:'' })
    setMessage('Guest added.')
  }

  // EDIT EVENT (image stays client-side upload; row update goes through API with token)
  function openEditEvent() {
    if (!event) return
    setModalError(null)
    setEvName(event.name ?? '')
    setEvCity(event.city ?? '')
    setEvTimezone(event.timezone ?? '')
    setEvStartsAtInput(formatLocalDDMMYYYYHHMM(event.starts_at))
    setEvCapacity(event.capacity ?? 0)
    setEvEventUrl(event.event_url ?? '')
    setEvImageUrl(event.image_url ?? '')
    setNewImageFile(null)
    setHosts(Array.isArray(event.hosts) ? [...event.hosts] : [])
    setIsEditingEvent(true)
  }
  function closeEditEvent() { setIsEditingEvent(false) }
  function updateHost(idx: number, patch: Partial<Host>) {
    setHosts(prev => prev.map((h,i)=> i===idx ? { ...h, ...patch } : h))
  }
  function addHost() { setHosts(prev => [...prev, { name: '', url: '' }]) }
  function removeHost(idx: number) { setHosts(prev => prev.filter((_,i)=> i!==idx)) }

  async function uploadEventImageIfNeeded(evId: string): Promise<string | null> {
    if (!newImageFile) return null
    const ext = newImageFile.name.split('.').pop() || 'jpg'
    const path = `images/${evId}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('events').upload(path, newImageFile, { upsert: true, cacheControl: '3600' })
    if (upErr) { throw upErr }
    const { data } = supabase.storage.from('events').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveEvent() {
    if (!event) return
    setSaving(true)
    setModalError(null)
    try {
      const iso = parseFlexibleToISO(evStartsAtInput)
      if (!iso) {
        setModalError('Invalid date/time. Use "DD/MM/YYYY, HH:mm" or pick a valid value.')
        setSaving(false)
        return
      }

      let nextImageUrl = evImageUrl
      const uploaded = await uploadEventImageIfNeeded(event.id)
      if (uploaded) nextImageUrl = uploaded

      const patch = {
        name: evName.trim(),
        city: evCity.trim() || null,
        timezone: evTimezone.trim() || null,
        starts_at: iso,
        capacity: Number.isFinite(evCapacity) ? evCapacity : null,
        image_url: nextImageUrl || null,
        event_url: evEventUrl.trim() || null,
        hosts: hosts
          .map(h => ({ name: (h.name ?? '').trim(), url: (h.url ?? '').trim() || null }))
          .filter(h => h.name.length > 0),
      }

      // >>> CALL our API with the edit token (no auth session required)
      const res = await fetch('/api/events/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          editToken: event.edit_token, // included in initial select
          patch
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update event')

      setEvent(json.event as EventRow)
      setMessage('Event updated.')
      closeEditEvent()
    } catch (err: any) {
      setModalError(err?.message ?? 'Failed to update event')
    } finally {
      setSaving(false)
    }
  }

  if (!event) {
    return (
      <main className="p-6 text-white">
        {message ? (
          <div>
            <p className="text-red-400 mb-4">{message}</p>
            <Link href="/" className="px-4 py-2 rounded border hover:bg-slate-900 inline-block">
              ← Back to Home
            </Link>
          </div>
        ) : (
          <p>Loading…</p>
        )}
      </main>
    )
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      {/* HEADER */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {event.image_url ? (
            <img src={event.image_url} alt="Event" className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg border border-dashed border-slate-700 shrink-0 flex items-center justify-center text-slate-500 text-xs">No image</div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight truncate" title={event.name}>{event.name}</h1>
            <p className="text-sm text-slate-400 truncate">
              {event.city ?? '—'} · {new Date(event.starts_at).toLocaleString()} · {event.timezone ?? '—'}
            </p>
            <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-2">
              {Array.isArray(event.hosts) && event.hosts.length > 0 && (
                <span className="truncate">
                  <span className="text-slate-400">Hosts:</span>{' '}
                  {event.hosts.map((h, i) => (
                    <span key={`${h.name}-${i}`}>
                      {h.url ? (<a href={h.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-100">{h.name}</a>) : (<span>{h.name}</span>)}
                      {i < event.hosts!.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              )}
              {event.event_url && (
                <a href={event.event_url} target="_blank" rel="noreferrer" className="underline hover:text-slate-100">Event link</a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={openEditEvent} className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">Edit event</button>
          <Link href="/" className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">New Event</Link>
          <label className="whitespace-nowrap px-4 py-2 rounded border cursor-pointer hover:bg-slate-900">
            Re-upload CSV
            <input type="file" accept=".csv,.txt" className="hidden" />
          </label>
          <Link href={`/checkin/${event.id}`} className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">Check-in</Link>
        </div>
      </header>

      {/* CAPACITY BAR */}
      <section className="space-y-2">
        <div className="flex items-center gap-6 text-sm">
          <div>Capacity: <span className="font-medium">{capacity}</span></div>
          <div>Confirmed (Approved) headcount: <span className="font-medium">{totals.confirmedHeadcount}</span></div>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: `${confirmedPct}%` }} title="Confirmed" />
        </div>
        <div className="flex items-center gap-3 text-sm mt-2">
          <span className="text-slate-400">Totals —</span>
          <span className="px-2 py-1 rounded bg-slate-700 text-slate-100">Total <b className="ml-1">{totals.totalHeadcount}</b></span>
          {(['APPROVED','PENDING','REJECTED','CANCELLED'] as NeonStatus[]).map(s => (
            <span key={s} className={`px-2 py-1 rounded ${STATUS_BG[s]}`}>
              {STATUS_LABEL[s]} <b className="ml-1">{totals[s]}</b>
            </span>
          ))}
          <span className="px-2 py-1 rounded bg-slate-700 text-slate-100">all: <b className="ml-1">{guests.length}</b></span>
        </div>
      </section>

      {/* ADD GUEST - DISABLED FOR PHASE 1: Join requests are created via app, not dashboard */}
      <section className="flex items-center justify-between">
        <button className="px-3 py-2 rounded border opacity-50 cursor-not-allowed" disabled title="Phase 1: Join requests are created by app users">
          Add guest (disabled)
        </button>
      </section>

      {isAdding && (
        <form onSubmit={handleCreateGuest} className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border rounded bg-slate-900/30">
          <input required value={newGuest.full_name} onChange={e=>setNewGuest(s=>({...s,full_name:e.target.value}))} placeholder="Full name" className="p-2 rounded border bg-transparent md:col-span-2" />
          <input required type="email" value={newGuest.email} onChange={e=>setNewGuest(s=>({...s,email:e.target.value}))} placeholder="Email" className="p-2 rounded border bg-transparent md:col-span-2" />
          <select value={newGuest.priority} onChange={e=>setNewGuest(s=>({...s,priority:e.target.value as Priority}))} className="p-2 rounded border bg-transparent">
            {(['normal','vip','vvip'] as Priority[]).map(p=> <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
          <select value={newGuest.status} onChange={e=>setNewGuest(s=>({...s,status:e.target.value as NeonStatus}))} className="p-2 rounded border bg-transparent">
            {(Object.keys(STATUS_LABEL) as NeonStatus[]).map(s=> <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <div className="flex items-center gap-2 md:col-span-2">
            <label className="text-sm text-slate-300">Plus-ones</label>
            <button type="button" className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>setNewGuest(s=>({...s,plus_ones: Math.max(0,s.plus_ones-1)}))}>−</button>
            <span className="min-w-6 text-center">{newGuest.plus_ones}</span>
            <button type="button" className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>setNewGuest(s=>({...s,plus_ones: s.plus_ones+1}))}>＋</button>
          </div>
          <input value={newGuest.comments} onChange={e=>setNewGuest(s=>({...s,comments:e.target.value}))} placeholder="Comments (e.g., invited by …)" className="p-2 rounded border bg-transparent md:col-span-4" />
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-3 py-2 rounded border bg-blue-700 hover:bg-blue-600">Save</button>
          </div>
        </form>
      )}

      {/* CONTROLS */}
      <section className="flex gap-3 items-center">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email…" className="flex-1 p-2 rounded border bg-transparent" />
        <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="p-2 rounded border bg-transparent">
          <option value="name">Sort: name</option>
          <option value="status">Sort: status</option>
          <option value="priority">Sort: priority</option>
          <option value="plus_ones">Sort: plus-ones</option>
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
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={6} className="p-4 text-center text-slate-400">No guests found.</td></tr>
            )}
            {filtered.map(g=>(
              <tr key={g.id} className="border-t border-slate-800">
                <td className="p-2">{g.full_name}</td>
                <td className="p-2">{g.email}</td>
                <td className="p-2">
                  <select value={(g.priority??'normal') as Priority} onChange={e=>handlePriorityChange(g, e.target.value as Priority)} className="px-2 py-1 rounded border bg-transparent">
                    {(['normal','vip','vvip'] as Priority[]).map(p=><option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select value={g.status} onChange={e=>handleStatusChange(g, e.target.value as NeonStatus)} className={`px-2 py-1 rounded border bg-transparent ${STATUS_BG[g.status]}`}>
                    {(Object.keys(STATUS_LABEL) as NeonStatus[]).map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <div className="inline-flex items-center gap-2">
                    <button className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>handlePlusOnes(g,-1)}>−</button>
                    <span>{g.plus_ones ?? 0}</span>
                    <button className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>handlePlusOnes(g, +1)}>＋</button>
                  </div>
                </td>
                <td className="p-2">
                  <input
                    value={g.comments ?? ''}
                    readOnly
                    onClick={() => { setCommentGuest(g); setCommentDraft(g.comments ?? '') }}
                    placeholder="Add a note…"
                    className="w-full p-1 rounded border bg-transparent cursor-pointer"
                    title={g.comments ?? ''}
                  />
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
            <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} rows={10} className="w-full p-3 rounded border bg-transparent resize-y" placeholder="Type your note…" />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={saveCommentModal}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {isEditingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeEditEvent} />
          <div className="relative z-10 w-[min(900px,95vw)] max-h-[92vh] overflow-auto bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit event</h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeEditEvent}>Close</button>
            </div>

            {modalError && <div className="text-sm text-red-300 border border-red-500/40 bg-red-900/20 rounded p-2">{modalError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">Event name
                <input value={evName} onChange={e=>setEvName(e.target.value)} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">City
                <input value={evCity} onChange={e=>setEvCity(e.target.value)} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">Starts at
                <input value={evStartsAtInput} onChange={e=>setEvStartsAtInput(e.target.value)} className="mt-1 w-full p-2 rounded border bg-transparent" placeholder="dd/mm/yyyy, hh:mm" />
              </label>
              <label className="text-sm">Timezone
                <input value={evTimezone} onChange={e=>setEvTimezone(e.target.value)} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">Capacity
                <input type="number" min={0} value={evCapacity} onChange={e=>setEvCapacity(Number(e.target.value))} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">Event link (Luma / Eventbrite / site)
                <input value={evEventUrl} onChange={e=>setEvEventUrl(e.target.value)} className="mt-1 w-full p-2 rounded border bg-transparent" placeholder="https://…" />
              </label>

              {/* Image upload */}
              <div className="md:col-span-2">
                <div className="text-sm mb-1">Event image (optional)</div>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border border-slate-700 overflow-hidden bg-slate-800 flex items-center justify-center">
                    {newImageFile ? (
                      <img src={URL.createObjectURL(newImageFile)} className="w-full h-full object-cover" />
                    ) : evImageUrl ? (
                      <img src={evImageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 rounded border cursor-pointer hover:bg-slate-800">
                      Choose file
                      <input type="file" accept="image/*" className="hidden" onChange={(e)=> setNewImageFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {newImageFile || evImageUrl ? (
                      <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={() => { setNewImageFile(null); setEvImageUrl('') }} type="button">
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Hosts */}
              <div className="md:col-span-2">
                <div className="text-sm mb-2">Hosts</div>
                <div className="space-y-2">
                  {hosts.map((h, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <input value={h.name ?? ''} onChange={e=>updateHost(idx,{name:e.target.value})} placeholder="Host name" className="p-2 rounded border bg-transparent md:col-span-2" />
                      <input value={h.url ?? ''} onChange={e=>updateHost(idx,{url:e.target.value})} placeholder="Host website / link" className="p-2 rounded border bg-transparent md:col-span-2" />
                      <div className="md:col-span-1 flex justify-end">
                        <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={()=>removeHost(idx)}>Remove</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={addHost}>+ Add host</button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={saveEvent} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="text-center text-sm text-amber-300">{message}</p>}
    </main>
  )
}
