'use client'

import { useEffect, useMemo, useState } from 'react'
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
}

const STATUS_LABEL: Record<Status, string> = {
  invite_sent: 'Invite sent',
  confirmed: 'Confirmed',
  waitlist: 'Waitlist',
  cancelled: 'Cancelled',
  checked_in: 'Checked-in',
}

const STATUS_BG: Record<Status, string> = {
  invite_sent: 'bg-slate-700 text-slate-100',
  confirmed: 'bg-blue-700 text-white',
  waitlist: 'bg-amber-700 text-white',
  cancelled: 'bg-red-700 text-white',
  checked_in: 'bg-green-700 text-white',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  normal: 'Normal',
  vip: 'VIP',
  vvip: 'VVIP',
}

export default function DashboardPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'priority' | 'plus_ones'>('name')
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Edit event modal
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [evDraft, setEvDraft] = useState<{
    name: string
    city: string
    timezone: string
    starts_at: string
    capacity: number
    image_url: string
    event_url: string
    hostsText: string
  } | null>(null)

  // Comments modal
  const [commentGuest, setCommentGuest] = useState<Guest | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  const [newGuest, setNewGuest] = useState<{
    full_name: string
    email: string
    status: Status
    plus_ones: number
    priority: Priority
    comments: string
  }>({ full_name: '', email: '', status: 'invite_sent', plus_ones: 0, priority: 'normal', comments: '' })

  useEffect(() => {
    if (!eventId) return
    ;(async () => {
      const { data: ev } = await supabase
        .from('events')
        .select('id,name,city,starts_at,timezone,capacity,image_url,event_url,hosts')
        .eq('id', eventId)
        .single()
      setEvent(ev as EventRow)

      const { data: gs } = await supabase
        .from('guests')
        .select('id,event_id,full_name,email,status,plus_ones,priority,comments')
        .eq('event_id', eventId)
        .order('full_name', { ascending: true })

      setGuests((gs ?? []).map(g => ({
        ...g,
        priority: (g.priority as Priority) ?? 'normal',
        comments: g.comments ?? '',
        status: (g.status as any) === 'invited' ? 'invite_sent' : g.status,
      })))
    })()
  }, [eventId])

  // ---- totals (headcounts include plus-ones) ----
  const totals = useMemo(() => {
    const base = { invite_sent: 0, confirmed: 0, waitlist: 0, cancelled: 0, checked_in: 0 }
    let invitedMetric = 0
    for (const g of guests) {
      const plus = Math.max(0, g.plus_ones ?? 0)
      const hc = 1 + plus
      invitedMetric += hc
      base[g.status] += hc
    }
    return {
      ...base,
      invitedMetric,
      confirmedHeadcount: base.confirmed,
      checkedInHeadcount: base.checked_in,
    }
  }, [guests])

  const capacity = event?.capacity ?? 0
  const confirmedPct = capacity ? Math.min(100, (totals.confirmedHeadcount / capacity) * 100) : 0
  const checkedPct   = capacity ? Math.min(100, (totals.checkedInHeadcount / capacity) * 100) : 0

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

  // ---- mutations ----
  async function handleStatusChange(g: Guest, next: Status) {
    await supabase.from('guests').update({ status: next }).eq('id', g.id)
    setGuests(prev => prev.map(x => x.id === g.id ? { ...x, status: next } : x))
  }
  async function handlePriorityChange(g: Guest, next: Priority) {
    await supabase.from('guests').update({ priority: next }).eq('id', g.id)
    setGuests(prev => prev.map(x => x.id===g.id ? { ...x, priority: next } : x))
  }
  async function handlePlusOnes(g: Guest, delta: 1 | -1) {
    const next = Math.max(0, (g.plus_ones ?? 0) + delta)
    await supabase.from('guests').update({ plus_ones: next }).eq('id', g.id)
    setGuests(prev => prev.map(x => x.id===g.id ? { ...x, plus_ones: next } : x))
  }

  // ---- comments modal ----
  function openCommentModal(g: Guest) { setCommentGuest(g); setCommentDraft(g.comments ?? '') }
  function closeCommentModal() { setCommentGuest(null); setCommentDraft('') }
  async function saveCommentModal() {
    if (!commentGuest) return
    await supabase.from('guests').update({ comments: commentDraft }).eq('id', commentGuest.id)
    setGuests(prev => prev.map(x => x.id === commentGuest.id ? { ...x, comments: commentDraft } : x))
    closeCommentModal()
  }

  // ---- add guest ----
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
    setNewGuest({ full_name:'', email:'', status:'invite_sent', plus_ones:0, priority:'normal', comments:'' })
    setMessage('Guest added.')
  }

  // ---- edit event modal ----
  function openEditEvent() {
    if (!event) return
    const hostsText = (event.hosts ?? [])
      .map(h => h.url ? `${h.name} | ${h.url}` : h.name)
      .join('\n')
    setEvDraft({
      name: event.name ?? '',
      city: event.city ?? '',
      timezone: event.timezone ?? '',
      starts_at: new Date(event.starts_at).toISOString().slice(0,16), // for <input type="datetime-local">
      capacity: event.capacity ?? 0,
      image_url: event.image_url ?? '',
      event_url: event.event_url ?? '',
      hostsText,
    })
    setIsEditingEvent(true)
  }
  function closeEditEvent() {
    setIsEditingEvent(false)
    setEvDraft(null)
  }
  function parseHosts(text: string): Host[] {
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [name, url] = line.split('|').map(s => s.trim())
        return url ? { name, url } : { name }
      })
  }
  async function saveEvent() {
    if (!event || !evDraft) return
    const patch = {
      name: evDraft.name.trim(),
      city: evDraft.city.trim() || null,
      timezone: evDraft.timezone.trim() || null,
      starts_at: new Date(evDraft.starts_at).toISOString(),
      capacity: Number.isFinite(evDraft.capacity) ? evDraft.capacity : null,
      image_url: evDraft.image_url.trim() || null,
      event_url: evDraft.event_url.trim() || null,
      hosts: parseHosts(evDraft.hostsText),
    }
    const { data, error } = await supabase
      .from('events')
      .update(patch)
      .eq('id', event.id)
      .select('id,name,city,starts_at,timezone,capacity,image_url,event_url,hosts')
      .single()
    if (error) { setMessage(error.message); return }
    setEvent(data as EventRow)
    closeEditEvent()
    setMessage('Event updated.')
  }

  if (!event) return <main className="p-6 text-white">Loading…</main>

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      {/* HEADER */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Event image */}
          {event.image_url ? (
            <img
              src={event.image_url}
              alt="Event"
              className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg border border-dashed border-slate-700 shrink-0 flex items-center justify-center text-slate-500 text-xs">No image</div>
          )}

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight truncate" title={event.name}>
              {event.name}
            </h1>
            <p className="text-sm text-slate-400 truncate">
              {event.city ?? '—'} · {new Date(event.starts_at).toLocaleString()} · {event.timezone ?? '—'}
            </p>

            {/* Hosts + event link */}
            <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-2">
              {Array.isArray(event.hosts) && event.hosts.length > 0 && (
                <span className="truncate">
                  <span className="text-slate-400">Hosts:</span>{' '}
                  {event.hosts.map((h, i) => (
                    <span key={`${h.name}-${i}`}>
                      {h.url ? (
                        <a href={h.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-100">
                          {h.name}
                        </a>
                      ) : (
                        <span>{h.name}</span>
                      )}
                      {i < event.hosts!.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              )}
              {event.event_url && (
                <a href={event.event_url} target="_blank" rel="noreferrer" className="underline hover:text-slate-100">
                  Event link
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Edit event */}
          <button onClick={openEditEvent} className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">
            Edit event
          </button>

          <Link href="/" className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">
            New Event
          </Link>
          <label className="whitespace-nowrap px-4 py-2 rounded border cursor-pointer hover:bg-slate-900">
            Re-upload CSV
            <input type="file" accept=".csv,.txt" className="hidden" />
          </label>
          <Link href={`/checkin/${event.id}`} className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">
            Check-in
          </Link>
        </div>
      </header>

      {/* CAPACITY BAR */}
      <section className="space-y-2">
        <div className="flex items-center gap-6 text-sm">
          <div>Capacity: <span className="font-medium">{capacity}</span></div>
          <div>Confirmed headcount: <span className="font-medium">{totals.confirmedHeadcount}</span></div>
          <div>Checked-in headcount: <span className="font-medium">{totals.checkedInHeadcount}</span></div>
        </div>

        <div className="h-2 w-full bg-slate-800 rounded overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: `${confirmedPct}%` }} title="Confirmed" />
          <div className="h-full bg-green-600 -mt-2" style={{ width: `${checkedPct}%` }} title="Checked-in" />
        </div>

        <div className="flex items-center gap-3 text-sm mt-2">
          <span className="text-slate-400">Totals —</span>
          <span className="px-2 py-1 rounded bg-slate-700 text-slate-100">Invited <b className="ml-1">{totals.invitedMetric}</b></span>
          {(['confirmed','waitlist','cancelled','checked_in'] as Status[]).map(s => (
            <span key={s} className={`px-2 py-1 rounded ${STATUS_BG[s]}`}>
              {STATUS_LABEL[s]} <b className="ml-1">{(totals as any)[s]}</b>
            </span>
          ))}
          <span className="px-2 py-1 rounded bg-slate-700 text-slate-100">all: <b className="ml-1">{guests.length}</b></span>
        </div>
      </section>

      {/* ADD GUEST (always above search) */}
      <section className="flex items-center justify-between">
        <button className="px-3 py-2 rounded border hover:bg-slate-900" onClick={() => setIsAdding(v=>!v)}>
          {isAdding ? 'Cancel' : 'Add guest'}
        </button>
      </section>

      {isAdding && (
        <form onSubmit={handleCreateGuest} className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border rounded bg-slate-900/30">
          <input required value={newGuest.full_name} onChange={e=>setNewGuest(s=>({...s,full_name:e.target.value}))} placeholder="Full name" className="p-2 rounded border bg-transparent md:col-span-2" />
          <input required type="email" value={newGuest.email} onChange={e=>setNewGuest(s=>({...s,email:e.target.value}))} placeholder="Email" className="p-2 rounded border bg-transparent md:col-span-2" />
          <select value={newGuest.priority} onChange={e=>setNewGuest(s=>({...s,priority:e.target.value as Priority}))} className="p-2 rounded border bg-transparent">
            {(['normal','vip','vvip'] as Priority[]).map(p=> <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
          <select value={newGuest.status} onChange={e=>setNewGuest(s=>({...s,status:e.target.value as Status}))} className="p-2 rounded border bg-transparent">
            {(Object.keys(STATUS_LABEL) as Status[]).map(s=> <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
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
                  <select value={g.status} onChange={e=>handleStatusChange(g, e.target.value as Status)} className={`px-2 py-1 rounded border bg-transparent ${STATUS_BG[g.status]}`}>
                    {(Object.keys(STATUS_LABEL) as Status[]).map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
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
              <h2 className="text-lg font-semibold">
                Edit note — {commentGuest.full_name}
              </h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeCommentModal}>
                Close (Esc)
              </button>
            </div>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={10}
              className="w-full p-3 rounded border bg-transparent resize-y"
              placeholder="Type your note…"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={closeCommentModal}>
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded border bg-blue-700 hover:bg-blue-600"
                onClick={saveCommentModal}
                title="Save (⌘/Ctrl + Enter)"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {isEditingEvent && evDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeEditEvent} />
          <div className="relative z-10 w-[min(900px,95vw)] max-h-[92vh] overflow-auto bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit event</h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeEditEvent}>Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">Name
                <input value={evDraft.name} onChange={e=>setEvDraft(s=>s && ({...s,name:e.target.value}))} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">City
                <input value={evDraft.city} onChange={e=>setEvDraft(s=>s && ({...s,city:e.target.value}))} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">Timezone
                <input value={evDraft.timezone} onChange={e=>setEvDraft(s=>s && ({...s,timezone:e.target.value}))} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">Starts at
                <input type="datetime-local" value={evDraft.starts_at} onChange={e=>setEvDraft(s=>s && ({...s,starts_at:e.target.value}))} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">Capacity
                <input type="number" min={0} value={evDraft.capacity} onChange={e=>setEvDraft(s=>s && ({...s,capacity: Number(e.target.value)}))} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
              <label className="text-sm">Event URL
                <input value={evDraft.event_url} onChange={e=>setEvDraft(s=>s && ({...s,event_url:e.target.value}))} className="mt-1 w-full p-2 rounded border bg-transparent" placeholder="https://…" />
              </label>
              <label className="text-sm md:col-span-2">Image URL
                <input value={evDraft.image_url} onChange={e=>setEvDraft(s=>s && ({...s,image_url:e.target.value}))} className="mt-1 w-full p-2 rounded border bg-transparent" placeholder="https://…" />
              </label>
              <label className="text-sm md:col-span-2">Hosts (one per line — `Name` or `Name | https://link`)
                <textarea rows={5} value={evDraft.hostsText} onChange={e=>setEvDraft(s=>s && ({...s,hostsText:e.target.value}))} className="mt-1 w-full p-2 rounded border bg-transparent" />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={closeEditEvent}>Cancel</button>
              <button className="px-3 py-2 rounded border bg-blue-700 hover:bg-blue-600" onClick={saveEvent}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="text-center text-sm text-amber-300">{message}</p>}
    </main>
  )
}
