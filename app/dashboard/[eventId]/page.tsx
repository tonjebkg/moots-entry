'use client'

import {useEffect, useMemo, useState} from 'react'
import {useParams, useRouter} from 'next/navigation'
import Link from 'next/link'
import Papa, { ParseResult } from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'

type Status = 'invited' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in'

type Guest = {
  id: string
  event_id: string
  full_name: string
  email: string
  status: Status
  plus_ones: number | null
  token: string | null
}

type EventRow = {
  id: string
  name: string
  city: string | null
  starts_at: string
  timezone: string | null
  capacity: number | null
}

const STATUS_LABEL: Record<Status,string> = {
  invited: 'Invited',
  confirmed: 'Confirmed',
  waitlist: 'Waitlist',
  cancelled: 'Cancelled',
  checked_in: 'Checked-in',
}

const STATUS_BG: Record<Status,string> = {
  invited:   'bg-slate-700 text-slate-100',
  confirmed: 'bg-blue-700 text-white',
  waitlist:  'bg-amber-700 text-white',
  cancelled: 'bg-red-700 text-white',
  checked_in:'bg-green-700 text-white',
}

function normalizeEmail(s: string) {
  return (s || '').trim().toLowerCase()
}
function normalizeName(s: string) {
  return (s || '').trim()
}

export default function DashboardPage() {
  const { eventId } = useParams<{eventId: string}>()
  const router = useRouter()

  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  // inline add guest (single row)
  const [newName, setNewName]   = useState('')
  const [newEmail, setNewEmail] = useState('')

  // search/sort
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'email' | 'status'>('name')

  useEffect(() => {
    if (!eventId) return
    ;(async () => {
      setLoading(true)
      const { data: ev, error: e1 } = await supabase
        .from('events')
        .select('id,name,city,starts_at,timezone,capacity')
        .eq('id', eventId as string)
        .single()
      if (e1) console.error(e1)
      setEvent(ev ?? null)

      const { data: gs, error: e2 } = await supabase
        .from('guests')
        .select('id,event_id,full_name,email,status,plus_ones,token')
        .eq('event_id', eventId as string)
        .order('full_name', { ascending: true })
      if (e2) {
        setMessage(`Failed to load guests: ${e2.message}`)
      } else {
        setGuests((gs ?? []) as Guest[])
      }
      setLoading(false)
    })()
  }, [eventId])

  // derived counts & lists
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = term
      ? guests.filter(g =>
          (g.full_name || '').toLowerCase().includes(term) ||
          (g.email || '').toLowerCase().includes(term))
      : guests.slice()

    switch (sortKey) {
      case 'email':  list.sort((a,b)=>a.email.localeCompare(b.email)); break
      case 'status': list.sort((a,b)=>STATUS_LABEL[a.status].localeCompare(STATUS_LABEL[b.status])); break
      default:       list.sort((a,b)=>a.full_name.localeCompare(b.full_name)); break
    }
    return list
  }, [guests, q, sortKey])

  const totals = useMemo(() => {
    const base: Record<Status, number> = {
      invited: 0, confirmed: 0, waitlist: 0, cancelled: 0, checked_in: 0
    }
    for (const g of guests) base[g.status] += 1
    const checkedInHeadcount = guests.reduce((n, g) => {
      if (g.status === 'checked_in') {
        const p = typeof g.plus_ones === 'number' ? g.plus_ones : 0
        return n + 1 + Math.max(0, p)
      }
      return n
    }, 0)
    const confirmedHeadcount = guests.reduce((n,g) => {
      if (g.status === 'confirmed') {
        const p = typeof g.plus_ones === 'number' ? g.plus_ones : 0
        return n + 1 + Math.max(0, p)
      }
      return n
    }, 0)
    return {
      ...base,
      all: guests.length,
      confirmedHeadcount,
      checkedInHeadcount,
    }
  }, [guests])

  const capacity = event?.capacity ?? 0
  const capacityFill = useMemo(() => {
    const confirmed = totals.confirmedHeadcount
    const checked   = totals.checkedInHeadcount
    return { confirmed, checked }
  }, [totals])

  async function handleAddGuest() {
    const full_name = normalizeName(newName)
    const email = normalizeEmail(newEmail)
    if (!full_name || !email) {
      setMessage('Enter full name and email.')
      return
    }
    const row: Omit<Guest,'id'> = {
      event_id: eventId as string,
      full_name, email,
      status: 'invited',
      plus_ones: 0,
      token: uuidv4(),
    } as any

    const { data, error } = await supabase
      .from('guests')
      .insert([row])
      .select('id,event_id,full_name,email,status,plus_ones,token')
      .single()
    if (error) {
      setMessage(`Failed to add guest: ${error.message}`)
      return
    }
    setGuests(prev => [...prev, data as Guest])
    setNewName(''); setNewEmail('')
  }

  async function handleStatusChange(g: Guest, next: Status) {
  // optimistic UI
  setGuests(prev => prev.map(x => x.id === g.id ? { ...x, status: next } : x))

  const { error } = await supabase
    .from('guests')
    .update({ status: next })
    .eq('id', g.id)
    .eq('event_id', g.event_id)

  if (error) {
    setMessage('Failed to update status.')
    // revert UI
    setGuests(prev => prev.map(x => x.id === g.id ? { ...x, status: g.status } : x))
    return
  }

  // ---- Checkins table sync ----
  const wasCheckedIn = g.status === 'checked_in'

  if (next === 'checked_in') {
    await supabase
      .from('checkins')
      .upsert(
        [{ event_id: g.event_id, guest_id: g.id, checked_in_at: new Date().toISOString() }],
        { onConflict: 'event_id,guest_id' }
      )
  } else if (wasCheckedIn && next !== g.status) {
    // here g.status is definitely 'checked_in', so comparing to g.status avoids the
    // “unintentional comparison” error while keeping the logic identical
    await supabase
      .from('checkins')
      .delete()
      .eq('event_id', g.event_id)
      .eq('guest_id', g.id)
  }
}


  async function handlePlusOnes(g: Guest, delta: 1 | -1) {
    const current = typeof g.plus_ones === 'number' ? g.plus_ones : 0
    const next = Math.max(0, current + delta)
    setGuests(prev => prev.map(x => x.id === g.id ? {...x, plus_ones: next} : x))
    const { error } = await supabase
      .from('guests')
      .update({ plus_ones: next })
      .eq('id', g.id)
      .eq('event_id', g.event_id)
    if (error) setMessage('Failed to update plus-ones.')
  }

  // CSV re-upload (typed, robust)
  async function handleCsvReupload(file: File) {
    setMessage(null)
    const parsed = await new Promise<ParseResult<Record<string,string>>>((resolve, reject) => {
      Papa.parse<Record<string,string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res),
        error: (err) => reject(err),
      })
    })

    if (parsed.errors && parsed.errors.length > 0) {
      const first = parsed.errors[0]
      throw new Error(`CSV parse error at row ${first.row ?? 'N/A'}: ${first.message}`)
    }

    // support various headers
    const toIncoming = (r: Record<string,string>) => {
      const first = (r['first_name'] || r['First Name'] || r['First name'] || '').trim()
      const last  = (r['last_name']  || r['Last Name']  || r['Last name']  || '').trim()
      const fromParts = [first, last].filter(Boolean).join(' ').trim()
      const full = (r['name'] || r['full_name'] || r['Full Name'] || fromParts || '').trim()
      const email = (r['email'] || r['Email'] || r['e-mail'] || '').trim()
      return { full_name: full, email: normalizeEmail(email) }
    }

    const incoming = parsed.data
      .map(toIncoming)
      .filter(x => x.email && x.full_name)

    const currentByEmail = new Map(guests.map(g => [normalizeEmail(g.email), g]))
    const incomingByEmail = new Map(incoming.map(g => [g.email, g]))

    const toAdd   = incoming.filter(g => !currentByEmail.has(g.email))
    const toKeep  = new Set(incoming.map(g => g.email))
    const toRemove= guests.filter(g => !toKeep.has(normalizeEmail(g.email)))

    let added = 0, removed = 0
    if (toAdd.length > 0) {
      const rows = toAdd.map(g => ({
        id: uuidv4(),
        event_id: eventId as string,
        full_name: g.full_name,
        email: g.email,
        status: 'invited' as Status,
        plus_ones: 0,
        token: uuidv4(),
      }))
      const { error } = await supabase.from('guests').insert(rows)
      if (error) {
        setMessage(`Upload failed: ${error.message}`)
      } else {
        added = rows.length
      }
    }
    if (toRemove.length > 0) {
      const emails = toRemove.map(g => normalizeEmail(g.email))
      const { error } = await supabase
        .from('guests')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId as string)
        .in('email', emails)
      if (!error) removed = emails.length
      // also clear checkins for removed
      await supabase.from('checkins')
        .delete()
        .eq('event_id', eventId as string)
        .in('guest_id', toRemove.map(g => g.id))
    }

    // refresh
    const { data: gs } = await supabase
      .from('guests')
      .select('id,event_id,full_name,email,status,plus_ones,token')
      .eq('event_id', eventId as string)
      .order('full_name', { ascending: true })
    setGuests((gs ?? []) as Guest[])
    setMessage(`Updated: +${added} added, −${removed} removed.`)
  }

  if (loading) return <main className="p-6">Loading…</main>
  if (!event)  return <main className="p-6">Event not found.</main>

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  {/* Title block */}
  <div className="flex-1 min-w-0">
    <h1 className="text-2xl font-semibold leading-tight truncate" title={event.name}>
      {event.name}
    </h1>
    <p className="text-sm text-slate-400 truncate">
      {(event.city || '—')}{' · '}
      {event.starts_at ? new Date(event.starts_at).toLocaleString() : 'Date TBA'}{' · '}
      {event.timezone || '—'}
    </p>
  </div>

  {/* Actions */}
  <div className="flex items-center gap-3 shrink-0">
    <label className="px-4 py-2 rounded border cursor-pointer hover:bg-slate-900 whitespace-nowrap">
      Re-upload CSV
      <input
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleCsvReupload(f).catch(err => setMessage(String(err?.message ?? err)))
          e.currentTarget.value = ''
        }}
      />
    </label>

    <Link
      href={`/checkin/${event.id}`}
      className="px-4 py-2 rounded border hover:bg-slate-900 whitespace-nowrap"
    >
      Open Check-in
    </Link>
  </div>
</header>

      {/* Capacity / Headcounts */}
      <section className="space-y-2">
        <div className="flex items-center gap-6 text-sm">
          <div>Capacity: <span className="font-medium">{event.capacity ?? 0}</span></div>
          <div>Confirmed headcount: <span className="font-medium">{totals.confirmedHeadcount}</span></div>
          <div>Checked-in headcount: <span className="font-medium">{totals.checkedInHeadcount}</span></div>
        </div>
        {/* Segmented bar */}
        <div className="h-2 w-full bg-slate-800 rounded overflow-hidden">
          <div
            className="h-full bg-blue-600"
            style={{ width: capacity ? `${Math.min(100, (capacityFill.confirmed / capacity) * 100)}%` : '0%' }}
            title="Confirmed"
          />
          <div
            className="h-full bg-green-600 -mt-2"
            style={{ width: capacity ? `${Math.min(100, (capacityFill.checked   / capacity) * 100)}%` : '0%' }}
            title="Checked-in (overlay)"
          />
        </div>

        {/* Totals chips */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">Totals —</span>
          {(['invited','confirmed','waitlist','cancelled','checked_in'] as Status[]).map((s) => (
            <span key={s} className={`px-2 py-1 rounded ${STATUS_BG[s]}`}>
              {STATUS_LABEL[s]} <b className="ml-1">{(totals as any)[s]}</b>
            </span>
          ))}
          <span className="px-2 py-1 rounded bg-slate-700 text-slate-100">all: <b className="ml-1">{totals.all}</b></span>
        </div>
      </section>

      {/* Controls row — inline add + search + sort */}
      <section className="flex gap-3 items-center">
        <input
          value={newName}
          onChange={e=>setNewName(e.target.value)}
          placeholder="Full name"
          className="w-64 p-2 rounded border bg-transparent"
        />
        <input
          value={newEmail}
          onChange={e=>setNewEmail(e.target.value)}
          placeholder="Email"
          className="w-72 p-2 rounded border bg-transparent"
        />
        <button
          onClick={handleAddGuest}
          className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border"
        >
          Add guest
        </button>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search name or email…  ( / focuses )"
          className="flex-1 p-2 rounded border bg-transparent"
          onKeyDown={(e)=>{ if (e.key === '/') { e.preventDefault(); (e.target as HTMLInputElement).focus() }}}
        />
        <select
          value={sortKey}
          onChange={e=>setSortKey(e.target.value as any)}
          className="p-2 rounded border bg-transparent"
        >
          <option value="name">Sort: name</option>
          <option value="email">Sort: email</option>
          <option value="status">Sort: status</option>
        </select>
      </section>

      {/* Table */}
      <section className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="text-left p-2 w-[28%]">Name</th>
              <th className="text-left p-2 w-[32%]">Email</th>
              <th className="text-left p-2 w-[20%]">Status</th>
              <th className="text-left p-2 w-[20%]">Plus-ones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-400">
                  No guests match your search.
                </td>
              </tr>
            )}
            {filtered.map(g => (
              <tr key={g.id} className="border-t border-slate-800">
                <td className="p-2">{g.full_name}</td>
                <td className="p-2">{g.email}</td>
                <td className="p-2">
                  <select
                    value={g.status}
                    onChange={e=>handleStatusChange(g, e.target.value as Status)}
                    className={`px-2 py-1 rounded border bg-transparent ${STATUS_BG[g.status]}`}
                  >
                    {(['invited','confirmed','waitlist','cancelled','checked_in'] as Status[]).map(s=>(
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <div className="inline-flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded border hover:bg-slate-900"
                      onClick={()=>handlePlusOnes(g, -1)}
                    >−</button>
                    <span>{typeof g.plus_ones === 'number' ? g.plus_ones : 0}</span>
                    <button
                      className="px-2 py-1 rounded border hover:bg-slate-900"
                      onClick={()=>handlePlusOnes(g, +1)}
                    >＋</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {message && (
        <p className="text-center text-sm text-amber-300">{message}</p>
      )}
    </main>
  )
}
