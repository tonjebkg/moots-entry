'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'

export default function CreateEventForm() {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [timezone, setTimezone] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [capacity, setCapacity] = useState<number | ''>('')
  const [eventUrl, setEventUrl] = useState('')
  const [hosts, setHosts] = useState<{ name: string; link?: string }[]>([{ name: '', link: '' }])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [guests, setGuests] = useState<any[]>([])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)

  // ---------- HELPERS ----------
  function normalizeStatus(
    s?: string
  ): 'invite_sent' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in' {
    const x = (s || '').trim().toLowerCase()
    if (!x) return 'invite_sent'
    if (['invite sent', 'invited', 'invite_sent'].includes(x)) return 'invite_sent'
    if (['confirmed', 'confirm', 'ok'].includes(x)) return 'confirmed'
    if (['waitlist', 'waitlisted', 'waiting'].includes(x)) return 'waitlist'
    if (['cancelled', 'canceled', 'cancel'].includes(x)) return 'cancelled'
    if (['checked_in', 'checked-in', 'checkedin', 'checkin', 'checked in'].includes(x))
      return 'checked_in'
    return 'invite_sent'
  }

  function normalizePriority(x?: string): 'normal' | 'vip' | 'vvip' {
    const s = (x || '').trim().toLowerCase()
    if (s === 'vvip') return 'vvip'
    if (s === 'vip') return 'vip'
    return 'normal'
  }

  // ---------- EVENT CREATION ----------
  async function handleCreateEvent() {
    try {
      setError(null)
      setToast(null)
      setLoading(true)

      let image_url: string | null = null
      if (imageFile) {
        const { data: upload, error: uploadErr } = await supabase.storage
          .from('events')
          .upload(`images/${Date.now()}_${imageFile.name}`, imageFile, {
            cacheControl: '3600',
            upsert: false,
          })
        if (uploadErr) throw uploadErr
        const { data: publicUrl } = supabase.storage.from('events').getPublicUrl(upload.path)
        image_url = publicUrl.publicUrl
      }

      const { data, error: insertErr } = await supabase
        .from('events')
        .insert([
          {
            name,
            city,
            timezone,
            starts_at: startsAt ? new Date(startsAt).toISOString() : null,
            capacity: capacity || null,
            event_url: eventUrl || null,
            image_url,
            hosts,
          },
        ])
        .select('id')
        .single()

      if (insertErr) throw insertErr
      setCurrentEventId(data.id)
      setToast('Event created successfully!')
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  // ---------- CSV HANDLER ----------
  async function handleGuestFile(file?: File) {
    if (!file) return
    if (!currentEventId) {
      setError('Create the event first, then upload the guest list.')
      return
    }

    setParsing(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data as any[]).filter(Boolean)
          const guests = rows.map((r) => {
            const fullName =
              r.full_name || r.name || r['Full Name'] || r['Full name'] || r['Name'] || ''
            const email = (r.email || r['Email'] || '').toLowerCase().trim()
            const status = normalizeStatus(r.status || r['Status'])
            const plusOnesRaw =
              r.plus_ones ?? r['plus-ones'] ?? r['Plus Ones'] ?? r['plus ones'] ?? 0
            const priority = normalizePriority(r.priority || r['Priority'])
            const comments =
              r.comments || r['Comments'] || r['Notes'] || r['Note'] || null
            const plus_ones = Number.isFinite(+plusOnesRaw)
              ? Math.max(0, +plusOnesRaw)
              : 0

            return {
              event_id: currentEventId,
              full_name: String(fullName).trim(),
              email,
              status,
              plus_ones,
              priority,
              comments,
            }
          })

          const clean = guests.filter((g) => g.full_name || g.email)
          setGuests(clean)

          // Batch insert in chunks to avoid payload limits
          const chunkSize = 500
          for (let i = 0; i < clean.length; i += chunkSize) {
            const slice = clean.slice(i, i + chunkSize)
            const { error } = await supabase.from('guests').insert(slice)
            if (error) throw error
          }

          setToast(`Imported ${clean.length} guests`)
        } catch (err: any) {
          console.error(err)
          setError(err?.message || 'Failed to import CSV')
        } finally {
          setParsing(false)
        }
      },
      error: (err) => {
        console.error(err)
        setError(err?.message || 'Failed to parse CSV')
        setParsing(false)
      },
    })
  }

  // ---------- RENDER ----------
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 text-slate-100">
      <h1 className="text-3xl font-semibold">Create an event. Start check-in. See results.</h1>
      <p className="text-slate-400 text-sm">
        No login for this MVP. Create an event below — it will appear on this page and link directly to its dashboard.
      </p>

      {/* EVENT FORM */}
      <div className="space-y-4 border border-slate-800 rounded-xl p-6 bg-slate-900/40">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400">Event name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400">Starts at *</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Timezone</label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400">Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Event link (Luma, Eventbrite, etc.)</label>
            <input
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700"
            />
          </div>
        </div>

        {/* HOSTS */}
        <div>
          <label className="block text-sm text-slate-400">Hosts</label>
          {hosts.map((h, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                placeholder="Host name"
                value={h.name}
                onChange={(e) => {
                  const newHosts = [...hosts]
                  newHosts[i].name = e.target.value
                  setHosts(newHosts)
                }}
                className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
              />
              <input
                placeholder="Host website / link"
                value={h.link}
                onChange={(e) => {
                  const newHosts = [...hosts]
                  newHosts[i].link = e.target.value
                  setHosts(newHosts)
                }}
                className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
              />
              {i > 0 && (
                <button
                  onClick={() => setHosts(hosts.filter((_, idx) => idx !== i))}
                  className="px-2 text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setHosts([...hosts, { name: '', link: '' }])}
            className="px-3 py-1 text-sm bg-slate-800 rounded border border-slate-700 hover:bg-slate-700"
          >
            + Add host
          </button>
        </div>

        {/* EVENT IMAGE */}
        <div>
          <label className="block text-sm text-slate-400">Event image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-900 file:text-slate-200 hover:file:bg-slate-800"
          />
        </div>

        {/* GUEST LIST */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Guest list (.csv or .txt)</span>
            {guests.length > 0 && (
              <span className="text-xs text-slate-400">{guests.length} guests detected</span>
            )}
          </div>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => handleGuestFile(e.target.files?.[0])}
            className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-900 file:text-slate-200 hover:file:bg-slate-800"
          />
          <p className="text-xs text-slate-500">
            Required columns: <code>full_name</code> (or <code>name</code>/<code>Full Name</code>) and{' '}
            <code>email</code>. We auto-detect headers and ignore empty rows.
          </p>
          {parsing && <p className="text-xs text-slate-400">Parsing…</p>}
        </div>

        {/* ACTIONS */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleCreateEvent}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create event'}
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {toast && <p className="text-sm text-green-400">{toast}</p>}
      </div>
    </div>
  )
}
