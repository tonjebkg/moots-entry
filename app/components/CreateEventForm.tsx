'use client'

import { useState } from 'react'
import Papa from 'papaparse'

type NewGuest = {
  full_name: string
  email: string
  status: 'invite_sent' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in'
  plus_ones: number
  priority: 'normal' | 'vip' | 'vvip'
  comments: string | null
}

export default function CreateEventForm() {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [timezone, setTimezone] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [capacity, setCapacity] = useState<number | ''>('')
  const [eventUrl, setEventUrl] = useState('')
  const [hosts, setHosts] = useState<{ name: string; link?: string }[]>([{ name: '', link: '' }])

  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const [stagedGuests, setStagedGuests] = useState<NewGuest[]>([])
  const [parsing, setParsing] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ---------- Normalizers ----------
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

  // ---------- CSV handler (stage guests; no event required) ----------
  async function handleGuestFile(file?: File) {
    if (!file) return
    setParsing(true)
    setError(null)
    setToast(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data as any[]).filter(Boolean)
          const guests: NewGuest[] = rows.map((r) => {
            const fullName =
              r.full_name || r.name || r['Full Name'] || r['Full name'] || r['Name'] || ''
            const email = (r.email || r['Email'] || '').toLowerCase().trim()
            const status = normalizeStatus(r.status || r['Status'])
            const plusOnesRaw =
              r.plus_ones ?? r['plus-ones'] ?? r['Plus Ones'] ?? r['plus ones'] ?? 0
            const priority = normalizePriority(r.priority || r['Priority'])
            const comments = r.comments || r['Comments'] || r['Notes'] || r['Note'] || null
            const plus_ones = Number.isFinite(+plusOnesRaw) ? Math.max(0, +plusOnesRaw) : 0

            return { full_name: String(fullName).trim(), email, status, plus_ones, priority, comments }
          })

          const clean = guests.filter((g) => g.full_name || g.email)
          setStagedGuests(clean)
          setToast(`Guest list staged: ${clean.length} row(s) will be imported on create.`)
        } catch (err: any) {
          console.error(err)
          setError(err?.message || 'Failed to parse CSV')
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

  // ---------- Image upload via server route ----------
  async function handleImageFile(file?: File | null) {
    try {
      setImageUploading(true)
      setImageError(null)
      setImageUrl(null)

      if (!file) {
        setImageUploading(false)
        return
      }

      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/uploads/event-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')

      setImageUrl(json.url as string)
    } catch (e: any) {
      console.error(e)
      setImageError(e.message ?? 'Upload failed')
    } finally {
      setImageUploading(false)
    }
  }

  // ---------- Create Event (server route) ----------
  async function handleCreateEvent() {
    try {
      setLoading(true)
      setError(null)
      setToast(null)

      const payload = {
        event: {
          name: name.trim(),
          city: city.trim() || null,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          timezone: timezone || '',
          capacity: Number(capacity) || null,
          image_url: imageUrl || null,
          event_url: eventUrl.trim() || null,
          hosts: hosts.map(h => ({ name: h.name?.trim(), url: h.link?.trim() })).filter(h => h.name),
        },
        guests: stagedGuests,
      }

      const r = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed to create event')

      setToast(`Event created${stagedGuests.length ? ` + ${stagedGuests.length} guest(s) imported` : ''}.`)
      // Optionally reset form here
      // setName(''); setCity(''); ...
      setStagedGuests([])
    } catch (e: any) {
      console.error(e)
      setError(e.message ?? 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 border border-slate-800 rounded-xl p-6 bg-slate-900/40 text-slate-100">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400">Event name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
                   className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          </div>
          <div>
            <label className="block text-sm text-slate-400">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)}
                   className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400">Starts at *</label>
            <input type="datetime-local" value={startsAt}
                   onChange={(e) => setStartsAt(e.target.value)}
                   className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Timezone</label>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)}
                   className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400">Capacity</label>
            <input type="number" value={capacity as number | ''} onChange={(e) => setCapacity(Number(e.target.value))}
                   className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Event link (Luma, Eventbrite, etc.)</label>
            <input value={eventUrl} onChange={(e) => setEventUrl(e.target.value)}
                   className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          </div>
        </div>

        {/* Hosts */}
        <div>
          <label className="block text-sm text-slate-400">Hosts</label>
          {hosts.map((h, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input placeholder="Host name" value={h.name}
                     onChange={(e) => { const next = [...hosts]; next[i].name = e.target.value; setHosts(next) }}
                     className="flex-1 p-2 rounded bg-slate-800 border border-slate-700" />
              <input placeholder="Host website / link" value={h.link}
                     onChange={(e) => { const next = [...hosts]; next[i].link = e.target.value; setHosts(next) }}
                     className="flex-1 p-2 rounded bg-slate-800 border border-slate-700" />
              {i > 0 && (
                <button onClick={() => setHosts(hosts.filter((_, idx) => idx !== i))}
                        className="px-2 text-red-400" aria-label="Remove host">✕</button>
              )}
            </div>
          ))}
          <button onClick={() => setHosts([...hosts, { name: '', link: '' }])}
                  className="px-3 py-1 text-sm bg-slate-800 rounded border border-slate-700 hover:bg-slate-700">
            + Add host
          </button>
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm text-slate-400">Event image (optional)</label>
          <input type="file" accept="image/*"
                 onChange={(e) => handleImageFile(e.target.files?.[0] || null)}
                 className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-900 file:text-slate-200 hover:file:bg-slate-800" />
          {imageUploading && <p className="text-xs text-slate-400 mt-1">Uploading…</p>}
          {imageError && <p className="text-xs text-red-400 mt-1">{imageError}</p>}
          {imageUrl && <p className="text-xs text-slate-400 mt-1">Uploaded ✓</p>}
        </div>

        {/* CSV */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Guest list (.csv or .txt)</span>
            {stagedGuests.length > 0 && (
              <span className="text-xs text-slate-400">{stagedGuests.length} staged</span>
            )}
          </div>
          <input type="file" accept=".csv,.txt"
                 onChange={(e) => handleGuestFile(e.target.files?.[0])}
                 className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-900 file:text-slate-200 hover:file:bg-slate-800" />
          <p className="text-xs text-slate-500">
            Required columns: <code>full_name</code> (or <code>name</code>/<code>Full Name</code>) and <code>email</code>.
            We auto-detect headers and ignore empty rows.
          </p>
          {parsing && <p className="text-xs text-slate-400">Parsing…</p>}
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-end">
          <button onClick={handleCreateEvent} disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">
            {loading ? 'Creating…' : 'Create event'}
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {toast && <p className="text-sm text-green-400">{toast}</p>}
      </div>
    </div>
  )
}
