'use client'

import { useEffect, useState, useRef } from 'react'
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
  url?: string
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

// Format ISO date to MM/DD/YYYY
function formatUSDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`
}

// Parse MM/DD/YYYY to YYYY-MM-DD (for hidden date picker)
function usDateToISO(mmddyyyy: string): string {
  if (!mmddyyyy) return ''
  const parts = mmddyyyy.split('/')
  if (parts.length !== 3) return ''
  const [mm, dd, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// Parse YYYY-MM-DD to MM/DD/YYYY
function isoDateToUS(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const parts = yyyymmdd.split('-')
  if (parts.length !== 3) return ''
  const [yyyy, mm, dd] = parts
  return `${mm}/${dd}/${yyyy}`
}

// Format ISO time to "12:00 AM" format
function formatTime12Hour(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const hours24 = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${hours12}:${pad(minutes)} ${ampm}`
}

// Generate 30-minute increment time options from 12:00 AM to 11:30 PM
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hours12 = h % 12 || 12
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
      times.push(`${hours12}:${pad(m)} ${ampm}`)
    }
  }
  return times
}

// Combine US date (MM/DD/YYYY) + time (HH:MM AM/PM) -> ISO string
function combineToISO(mmddyyyy: string, timeStr: string): string {
  if (!mmddyyyy || !timeStr) return ''
  const [month, day, year] = mmddyyyy.split('/').map(Number)
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return ''
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hours !== 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  const d = new Date(year, month - 1, day, hours, minutes)
  return d.toISOString()
}

// Format date for US display (MM/DD/YYYY, HH:MM AM/PM)
function formatUSDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const dateStr = formatUSDate(iso)
  const timeStr = formatTime12Hour(iso)
  return `${dateStr}, ${timeStr}`
}

const STATUS_BG: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-600 text-slate-200',
  PUBLISHED: 'bg-green-700 text-white',
  COMPLETE: 'bg-blue-700 text-white',
  CANCELLED: 'bg-red-700 text-white',
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'UTC',
]

export default function DashboardHomePage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  // Create Event modal state
  const [isCreating, setIsCreating] = useState(false)
  const [evName, setEvName] = useState('')
  const [evTimezone, setEvTimezone] = useState('UTC')
  const [evStartDate, setEvStartDate] = useState('') // MM/DD/YYYY
  const [evStartTime, setEvStartTime] = useState('12:00 PM')
  const [evEndDate, setEvEndDate] = useState('') // MM/DD/YYYY
  const [evEndTime, setEvEndTime] = useState('3:00 PM')
  const [evEventUrl, setEvEventUrl] = useState('')
  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const [evImageUrl, setEvImageUrl] = useState<string>('')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [hosts, setHosts] = useState<Host[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [evIsPrivate, setEvIsPrivate] = useState(false)
  const [evApproveMode, setEvApproveMode] = useState<ApproveMode>('MANUAL')
  const [evStatus, setEvStatus] = useState<EventStatus>('DRAFT')
  const [evLocationVenue, setEvLocationVenue] = useState('')
  const [evLocationStreet, setEvLocationStreet] = useState('')
  const [evLocationCity, setEvLocationCity] = useState('')
  const [evLocationState, setEvLocationState] = useState('')
  const [evLocationCountry, setEvLocationCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  async function fetchEvents() {
    try {
      const res = await fetch(`/api/events?t=${Date.now()}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err: any) {
      console.error('Failed to load events:', err)
      setError(err.message || 'Failed to load events')
    }
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        await fetchEvents()
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

  function openCreateModal() {
    setModalError(null)
    setEvName('')
    setEvTimezone('America/New_York')
    setEvStartDate('')
    setEvStartTime('12:00 PM')
    setEvEndDate('')
    setEvEndTime('3:00 PM')
    setEvEventUrl('')
    setEvImageUrl('')
    setNewImageFile(null)
    setHosts([])
    setSponsors([])
    setEvIsPrivate(false)
    setEvApproveMode('MANUAL')
    setEvStatus('DRAFT')
    setEvLocationVenue('')
    setEvLocationStreet('')
    setEvLocationCity('')
    setEvLocationState('')
    setEvLocationCountry('USA')
    setIsCreating(true)
  }

  function closeCreateModal() {
    setIsCreating(false)
  }

  function updateHost(idx: number, patch: Partial<Host>) {
    setHosts(prev => prev.map((h, i) => i === idx ? { ...h, ...patch } : h))
  }

  function addHost() {
    setHosts(prev => [...prev, { name: '', url: '' }])
  }

  function removeHost(idx: number) {
    setHosts(prev => prev.filter((_, i) => i !== idx))
  }

  function moveHostUp(idx: number) {
    if (idx === 0) return
    setHosts(prev => {
      const copy = [...prev]
      const temp = copy[idx - 1]
      copy[idx - 1] = copy[idx]
      copy[idx] = temp
      return copy
    })
  }

  function moveHostDown(idx: number) {
    setHosts(prev => {
      if (idx >= prev.length - 1) return prev
      const copy = [...prev]
      const temp = copy[idx + 1]
      copy[idx + 1] = copy[idx]
      copy[idx] = temp
      return copy
    })
  }

  function updateSponsor(idx: number, patch: Partial<Sponsor>) {
    setSponsors(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function addSponsor() {
    setSponsors(prev => [...prev, { title: '', subtitle: '', url: '', logo_url: '', description: '' }])
  }

  function removeSponsor(idx: number) {
    setSponsors(prev => prev.filter((_, i) => i !== idx))
  }

  function moveSponsorUp(idx: number) {
    if (idx === 0) return
    setSponsors(prev => {
      const copy = [...prev]
      const temp = copy[idx - 1]
      copy[idx - 1] = copy[idx]
      copy[idx] = temp
      return copy
    })
  }

  function moveSponsorDown(idx: number) {
    setSponsors(prev => {
      if (idx >= prev.length - 1) return prev
      const copy = [...prev]
      const temp = copy[idx + 1]
      copy[idx + 1] = copy[idx]
      copy[idx] = temp
      return copy
    })
  }

  async function uploadEventImageIfNeeded(): Promise<string | null> {
    if (!newImageFile) return null

    // Upload to Azure Blob Storage via API route
    const formData = new FormData()
    formData.append('file', newImageFile)
    formData.append('eventId', '0') // Use 0 for new events

    const res = await fetch('/api/uploads/event-image', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to upload image')
    }

    const data = await res.json()
    return data.url
  }

  async function createEvent() {
    setSaving(true)
    setModalError(null)
    try {
      // Validate required fields
      if (!evName.trim()) {
        setModalError('Event title is required')
        setSaving(false)
        return
      }

      const startIso = datetimeLocalToISO(evStartsAtInput)
      if (!startIso) {
        setModalError('Start date & time is required')
        setSaving(false)
        return
      }

      const endIso = evEndsAtInput.trim() ? datetimeLocalToISO(evEndsAtInput) : null
      if (evEndsAtInput.trim() && !endIso) {
        setModalError('Invalid end date/time')
        setSaving(false)
        return
      }

      let imageUrl = evImageUrl
      const uploaded = await uploadEventImageIfNeeded()
      if (uploaded) imageUrl = uploaded

      // Build location object from individual fields
      const locationObj = {
        venue_name: evLocationVenue.trim() || undefined,
        street_address: evLocationStreet.trim() || undefined,
        city: evLocationCity.trim() || undefined,
        state_province: evLocationState.trim() || undefined,
        country: evLocationCountry.trim() || undefined,
      }
      const hasLocation = Object.values(locationObj).some(v => v)

      const payload = {
        event: {
          title: evName.trim(),
          location: hasLocation ? locationObj : null,
          start_date: startIso,
          end_date: endIso,
          timezone: evTimezone.trim() || 'UTC',
          image_url: imageUrl || null,
          event_url: evEventUrl.trim() || null,
          hosts: hosts
            .map(h => ({ name: (h.name ?? '').trim(), url: (h.url ?? '').trim() || null }))
            .filter(h => h.name.length > 0),
          sponsors: sponsors
            .map(s => ({
              title: (s.title ?? '').trim(),
              subtitle: (s.subtitle ?? '').trim() || null,
              url: (s.url ?? '').trim() || null,
              logo_url: (s.logo_url ?? '').trim() || null,
              description: (s.description ?? '').trim() || null,
            }))
            .filter(s => s.title.length > 0),
          is_private: evIsPrivate,
          approve_mode: evApproveMode,
          status: evStatus,
        }
      }

      // DEBUG: Log payload before sending
      console.log('[FRONTEND CREATE] Payload sponsors:', JSON.stringify(payload.event.sponsors, null, 2))
      console.log('[FRONTEND CREATE] Payload hosts:', JSON.stringify(payload.event.hosts, null, 2))

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create event')

      // Refetch events and clear search
      await fetchEvents()
      setQ('')

      closeCreateModal()
    } catch (err: any) {
      setModalError(err?.message ?? 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6" style={{ backgroundColor: '#020617', color: '#f1f5f9' }}>
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-400">Loading events...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6" style={{ backgroundColor: '#020617', color: '#f1f5f9' }}>
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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6" style={{ backgroundColor: '#020617', color: '#f1f5f9' }}>
      <div className="w-full space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Events Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Manage all events - {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded border border-slate-700 hover:bg-slate-900 whitespace-nowrap"
          >
            New Event
          </button>
        </header>

        {/* Search */}
        <section className="flex gap-3 items-center">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by title, city, or URL..."
            className="flex-1 p-2 rounded border border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:border-slate-500"
            style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
          />
        </section>

        {/* Events Table */}
        <section className="border border-slate-800 rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
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
                <th className="text-left p-2">Created</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-4 text-center text-slate-400">
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
                      {formatUSDateTime(event.start_date ?? event.starts_at ?? '')}
                    </td>
                    <td className="p-2 text-slate-300 text-xs">
                      {event.end_date ? formatUSDateTime(event.end_date) : '—'}
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

      {/* Create Event Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create event</h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeCreateModal}>Close</button>
            </div>

            {modalError && <div className="text-sm text-red-300 border border-red-500/40 bg-red-900/20 rounded p-2">{modalError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm md:col-span-2">
                Event title <span className="text-red-400">*</span>
                <input
                  value={evName}
                  onChange={e => setEvName(e.target.value)}
                  className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100"
                  style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                  required
                />
              </label>

              <label className="text-sm">Event status
                <select value={evStatus} onChange={e => setEvStatus(e.target.value as EventStatus)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>

              <label className="text-sm">Guest approval mode
                <select value={evApproveMode} onChange={e => setEvApproveMode(e.target.value as ApproveMode)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTO">Auto</option>
                </select>
              </label>

              <label className="text-sm flex items-center gap-2 mt-6 md:col-span-2">
                <input type="checkbox" checked={evIsPrivate} onChange={e => setEvIsPrivate(e.target.checked)} className="w-4 h-4" />
                <span>Private event</span>
              </label>

              <div className="space-y-2">
                <label className="text-sm">
                  Start date <span className="text-red-400">*</span>
                  <input
                    type="text"
                    value={evStartDate}
                    placeholder="MM/DD/YYYY"
                    onClick={() => startDateRef.current?.showPicker()}
                    readOnly
                    className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100 cursor-pointer"
                    style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                    required
                  />
                  <input
                    ref={startDateRef}
                    type="date"
                    className="hidden"
                    onChange={(e) => setEvStartDate(isoDateToUS(e.target.value))}
                  />
                </label>
                <label className="text-sm">
                  Start time <span className="text-red-400">*</span>
                  <select
                    value={evStartTime}
                    onChange={e => setEvStartTime(e.target.value)}
                    className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100"
                    style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                    required
                  >
                    {generateTimeOptions().map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm">
                  End date
                  <input
                    type="text"
                    value={evEndDate}
                    placeholder="MM/DD/YYYY"
                    onClick={() => endDateRef.current?.showPicker()}
                    readOnly
                    className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100 cursor-pointer"
                    style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                  />
                  <input
                    ref={endDateRef}
                    type="date"
                    className="hidden"
                    onChange={(e) => setEvEndDate(isoDateToUS(e.target.value))}
                  />
                </label>
                <label className="text-sm">
                  End time
                  <select
                    value={evEndTime}
                    onChange={e => setEvEndTime(e.target.value)}
                    className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100"
                    style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                  >
                    {generateTimeOptions().map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="text-sm md:col-span-2">Timezone
                <select
                  value={evTimezone}
                  onChange={e => setEvTimezone(e.target.value)}
                  className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100"
                  style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm md:col-span-2">Event link (Luma / Eventbrite / site)
                <input
                  value={evEventUrl}
                  onChange={e => setEvEventUrl(e.target.value)}
                  className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100"
                  style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                  placeholder="https://…"
                />
              </label>

              {/* Location */}
              <div className="md:col-span-2">
                <div className="text-sm font-medium mb-2">Location</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm">Venue name
                    <input value={evLocationVenue} onChange={e => setEvLocationVenue(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="Conference center, hotel, etc." />
                  </label>
                  <label className="text-sm">Street address
                    <input value={evLocationStreet} onChange={e => setEvLocationStreet(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="123 Main St" />
                  </label>
                  <label className="text-sm">City
                    <input value={evLocationCity} onChange={e => setEvLocationCity(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="San Francisco" />
                  </label>
                  <label className="text-sm">State
                    <select value={evLocationState} onChange={e => setEvLocationState(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                      <option value="">Select state...</option>
                      {US_STATES.map(state => (
                        <option key={state.code} value={state.code}>{state.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm md:col-span-2">Country
                    <input value="USA" readOnly className="mt-1 w-full p-2 rounded border bg-slate-800 text-slate-400" />
                  </label>
                </div>
              </div>

              {/* Image upload */}
              <div className="md:col-span-2">
                <div className="text-sm mb-1">Event image (optional)</div>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border border-slate-700 overflow-hidden bg-slate-800 flex items-center justify-center">
                    {newImageFile ? (
                      <img src={URL.createObjectURL(newImageFile)} className="w-full h-full object-cover" alt="Preview" />
                    ) : evImageUrl ? (
                      <img src={evImageUrl} className="w-full h-full object-cover" alt="Event" />
                    ) : (
                      <div className="text-xs text-slate-500">No image</div>
                    )}
                  </div>
                  <label className="px-3 py-2 rounded border hover:bg-slate-800 cursor-pointer">
                    Choose file
                    <input type="file" accept="image/*" className="hidden" onChange={e => setNewImageFile(e.target.files?.[0] || null)} />
                  </label>
                  {(newImageFile || evImageUrl) && (
                    <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={() => { setNewImageFile(null); setEvImageUrl('') }}>Remove</button>
                  )}
                </div>
              </div>

              {/* Hosts */}
              <div className="md:col-span-2">
                <div className="text-sm mb-2">Hosts</div>
                <div className="space-y-3">
                  {hosts.map((h, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex flex-col gap-1 pt-3">
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={() => moveHostUp(idx)} disabled={idx === 0} title="Move up">↑</button>
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={() => moveHostDown(idx)} disabled={idx === hosts.length - 1} title="Move down">↓</button>
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border border-slate-700 rounded">
                        <input value={h.name ?? ''} onChange={e => updateHost(idx, { name: e.target.value })} placeholder="Host name" className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-2" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                        <input value={h.url ?? ''} onChange={e => updateHost(idx, { url: e.target.value })} placeholder="Profile URL (optional)" className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-2" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                        <div className="md:col-span-1 flex justify-end">
                          <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={() => removeHost(idx)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={addHost}>+ Add host</button>
                </div>
              </div>

              {/* Sponsors */}
              <div className="md:col-span-2">
                <div className="text-sm mb-2">Sponsors</div>
                <div className="space-y-3">
                  {sponsors.map((s, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex flex-col gap-1 pt-3">
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={() => moveSponsorUp(idx)} disabled={idx === 0} title="Move up">↑</button>
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={() => moveSponsorDown(idx)} disabled={idx === sponsors.length - 1} title="Move down">↓</button>
                      </div>
                      <div className="flex-1 p-3 border border-slate-700 rounded space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <input value={s.title ?? ''} onChange={e => {
                              const val = e.target.value
                              if (val.length <= 60) updateSponsor(idx, { title: val })
                            }} placeholder="Sponsor name" maxLength={60} className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                            <div className="text-xs text-slate-400 mt-1">{(s.title ?? '').length} / 60 characters</div>
                          </div>
                          <div>
                            <input value={s.subtitle ?? ''} onChange={e => {
                              const val = e.target.value
                              if (val.length <= 80) updateSponsor(idx, { subtitle: val })
                            }} placeholder="Subtitle (optional)" maxLength={80} className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                            <div className="text-xs text-slate-400 mt-1">{(s.subtitle ?? '').length} / 80 characters</div>
                          </div>
                        </div>

                        <div>
                          <input value={s.url ?? ''} onChange={e => updateSponsor(idx, { url: e.target.value })} placeholder="Sponsor website / link (optional)" className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                        </div>

                        <div>
                          <textarea
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto'
                                el.style.height = el.scrollHeight + 'px'
                              }
                            }}
                            value={s.description ?? ''}
                            onChange={e => updateSponsor(idx, { description: e.target.value })}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement
                              target.style.height = 'auto'
                              target.style.height = target.scrollHeight + 'px'
                            }}
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full p-2 rounded border bg-slate-900 text-slate-100 resize-none overflow-hidden"
                            style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                          />
                          <div className="text-xs text-slate-400 mt-1">{(s.description ?? '').length} characters</div>
                        </div>

                        <div>
                          <div className="text-sm mb-1">Sponsor logo (optional)</div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-lg border border-slate-700 overflow-hidden bg-slate-800 flex items-center justify-center">
                              {s.logo_url ? (
                                <img src={s.logo_url} className="w-full h-full object-contain" alt="Sponsor logo" />
                              ) : (
                                <span className="text-xs text-slate-400">No image</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="px-3 py-2 rounded border cursor-pointer hover:bg-slate-800">
                                Choose file
                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  try {
                                    const formData = new FormData()
                                    formData.append('file', file)
                                    formData.append('eventId', '0')
                                    const res = await fetch('/api/uploads/event-image', {
                                      method: 'POST',
                                      body: formData,
                                    })
                                    if (!res.ok) throw new Error('Upload failed')
                                    const data = await res.json()
                                    updateSponsor(idx, { logo_url: data.url })
                                  } catch (err) {
                                    console.error('Logo upload failed:', err)
                                  }
                                }} />
                              </label>
                              {s.logo_url && (
                                <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={() => updateSponsor(idx, { logo_url: '' })}>
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={() => removeSponsor(idx)}>Remove sponsor</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={addSponsor}>+ Add sponsor</button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <button className="px-3 py-2 rounded border hover:bg-slate-800" onClick={createEvent} disabled={saving}>
                {saving ? 'Creating…' : 'Create event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
