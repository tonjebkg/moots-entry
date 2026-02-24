'use client'

import { useState, useRef } from 'react'

type ApproveMode = 'MANUAL' | 'AUTO'
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETE' | 'CANCELLED'

type Host = { name: string; url?: string | null }
type Sponsor = {
  title: string
  subtitle?: string
  url?: string
  logo_url?: string
  description?: string
}

interface CreateEventModalProps {
  onClose: () => void
  onSuccess: () => void
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

function isoDateToUS(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const parts = yyyymmdd.split('-')
  if (parts.length !== 3) return ''
  const [yyyy, mm, dd] = parts
  return `${mm}/${dd}/${yyyy}`
}

function datetimeLocalToISO(date: string, time: string, timezone: string): string {
  const dt = new Date(`${date} ${time}`)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
    .format(dt)
    .replace(' ', 'T') + 'Z'
}

export function CreateEventModal({ onClose, onSuccess }: CreateEventModalProps) {
  const [evName, setEvName] = useState('')
  const [evTimezone, setEvTimezone] = useState('America/New_York')
  const [evStartDate, setEvStartDate] = useState('')
  const [evStartTime, setEvStartTime] = useState('12:00 PM')
  const [evEndDate, setEvEndDate] = useState('')
  const [evEndTime, setEvEndTime] = useState('3:00 PM')
  const [evEventUrl, setEvEventUrl] = useState('')
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)

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

    const formData = new FormData()
    formData.append('file', newImageFile)
    formData.append('eventId', '0')

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

  async function handleSubmit() {
    setSaving(true)
    setError(null)

    try {
      if (!evName.trim()) {
        setError('Event title is required')
        setSaving(false)
        return
      }

      const startIso = datetimeLocalToISO(evStartDate, evStartTime, evTimezone)
      if (!startIso) {
        setError('Start date & time is required')
        setSaving(false)
        return
      }

      const endIso = evEndDate.trim() ? datetimeLocalToISO(evEndDate, evEndTime, evTimezone) : null
      if (evEndDate.trim() && !endIso) {
        setError('Invalid end date/time')
        setSaving(false)
        return
      }

      let imageUrl = evImageUrl
      const uploaded = await uploadEventImageIfNeeded()
      if (uploaded) imageUrl = uploaded

      const locationObj = {
        venue_name: evLocationVenue.trim() || undefined,
        street_address: evLocationStreet.trim() || undefined,
        city: evLocationCity.trim() || undefined,
        state_province: evLocationState.trim() || undefined,
        country: 'USA',
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

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create event')

      onSuccess()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1a1a2e]">Create Event</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[#6e6e7e] hover:text-[#1a1a2e] text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Event Title */}
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">
              Event Title <span className="text-red-600">*</span>
            </label>
            <input
              value={evName}
              onChange={(e) => setEvName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              placeholder="Enter event title"
              required
            />
          </div>

          {/* Status and Approval Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">
                Status
              </label>
              <select
                value={evStatus}
                onChange={(e) => setEvStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="COMPLETE">Complete</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">
                Approval Mode
              </label>
              <select
                value={evApproveMode}
                onChange={(e) => setEvApproveMode(e.target.value as ApproveMode)}
                className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              >
                <option value="MANUAL">Manual</option>
                <option value="AUTO">Auto</option>
              </select>
            </div>
          </div>

          {/* Private Event Checkbox */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={evIsPrivate}
              onChange={(e) => setEvIsPrivate(e.target.checked)}
              className="w-4 h-4 text-[#0f3460] border-[#e1e4e8] rounded focus:ring-[#0f3460]"
            />
            <span className="text-sm font-medium text-[#4a4a5e]">Private event</span>
          </label>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1a1a2e]">
                Start Date <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={evStartDate}
                placeholder="MM/DD/YYYY"
                onClick={() => startDateRef.current?.showPicker()}
                readOnly
                className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] cursor-pointer focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
                required
              />
              <input
                ref={startDateRef}
                type="date"
                className="hidden"
                onChange={(e) => setEvStartDate(isoDateToUS(e.target.value))}
              />

              <label className="block text-sm font-semibold text-[#1a1a2e]">
                Start Time <span className="text-red-600">*</span>
              </label>
              <select
                value={evStartTime}
                onChange={(e) => setEvStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
                required
              >
                {generateTimeOptions().map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1a1a2e]">
                End Date
              </label>
              <input
                type="text"
                value={evEndDate}
                placeholder="MM/DD/YYYY"
                onClick={() => endDateRef.current?.showPicker()}
                readOnly
                className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] cursor-pointer focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              />
              <input
                ref={endDateRef}
                type="date"
                className="hidden"
                onChange={(e) => setEvEndDate(isoDateToUS(e.target.value))}
              />

              <label className="block text-sm font-semibold text-[#1a1a2e]">
                End Time
              </label>
              <select
                value={evEndTime}
                onChange={(e) => setEvEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              >
                {generateTimeOptions().map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">
              Timezone
            </label>
            <select
              value={evTimezone}
              onChange={(e) => setEvTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Event URL */}
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1">
              Event Link
            </label>
            <input
              value={evEventUrl}
              onChange={(e) => setEvEventUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              placeholder="https://..."
            />
          </div>

          {/* Location */}
          <div className="border-t border-[#e1e4e8] pt-4">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Location</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={evLocationVenue}
                onChange={(e) => setEvLocationVenue(e.target.value)}
                placeholder="Venue name"
                className="px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              />
              <input
                value={evLocationStreet}
                onChange={(e) => setEvLocationStreet(e.target.value)}
                placeholder="Street address"
                className="px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              />
              <input
                value={evLocationCity}
                onChange={(e) => setEvLocationCity(e.target.value)}
                placeholder="City"
                className="px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              />
              <select
                value={evLocationState}
                onChange={(e) => setEvLocationState(e.target.value)}
                className="px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors"
              >
                <option value="">Select state...</option>
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Simplified: Hide hosts/sponsors/image for now - can add back later */}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e1e4e8]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#e1e4e8] text-[#4a4a5e] text-sm font-semibold rounded-lg hover:bg-[#f8f9fa] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-[#1a1a2e] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
