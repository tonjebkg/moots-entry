'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase' // Still needed for guest operations only

// Neon status enum values
type NeonStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DRAFT'
type ApproveMode = 'MANUAL' | 'AUTO'
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETE' | 'CANCELLED'

type Sponsor = {
  title: string
  subtitle?: string
  url?: string
  logo_url?: string
  description?: string
}

type Location = {
  venue_name?: string
  street_address?: string
  city?: string
  state_province?: string
  country?: string
}

type Guest = {
  id: string
  event_id: string | number
  owner_id: string
  full_name: string
  email: string
  status: NeonStatus
  plus_ones: number | null
  comments?: string | null
  company_website?: string | null
  goals?: string | null
  looking_for?: string | null
  visibility_enabled?: boolean
  notifications_enabled?: boolean
  created_at?: string
  updated_at?: string
  photo_url?: string | null
}

type Host = { name: string; url?: string | null }

type EventRow = {
  id: string | number
  title: string // Neon uses "title" not "name"
  start_date: string // Neon uses "start_date" not "starts_at"
  end_date?: string
  timezone: string | null
  image_url?: string | null
  event_url?: string | null
  hosts?: Host[] | null
  sponsors?: Sponsor[] | null
  location?: Location | string | null // Support both object and legacy string
  is_private?: boolean
  approve_mode?: ApproveMode
  status?: EventStatus
  created_at?: string
  updated_at?: string
  edit_token?: string // used by /api/events/update
  // Legacy field for backward compatibility:
  name?: string // Will map to title
  city?: string | null // Will map to location.city
  starts_at?: string // Will map to start_date
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

// Format ISO date to MM/DD/YYYY
function formatUSDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`
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

export default function DashboardPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'plus_ones'>('name')
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Edit/Create event modal state
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [evName, setEvName] = useState('')
  const [evTimezone, setEvTimezone] = useState('')
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
  // Location fields (replacing evCity)
  const [evLocationVenue, setEvLocationVenue] = useState('')
  const [evLocationStreet, setEvLocationStreet] = useState('')
  const [evLocationCity, setEvLocationCity] = useState('')
  const [evLocationState, setEvLocationState] = useState('')
  const [evLocationCountry, setEvLocationCountry] = useState('')
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
    comments: string
  }>({ full_name: '', email: '', status: 'PENDING', plus_ones: 0, comments: '' })

  async function fetchEvent() {
    if (!eventId) return
    try {
      const eventRes = await fetch(`/api/events/${eventId}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      if (!eventRes.ok) {
        const errorText = await eventRes.text()
        console.error('Failed to fetch event:', errorText)
        setMessage(`Failed to load event: ${eventRes.status}`)
        return
      }
      const eventData = await eventRes.json()
      // DEBUG: Log what was received from API
      console.log('[FRONTEND GET] Received sponsors:', JSON.stringify(eventData.sponsors, null, 2))
      console.log('[FRONTEND GET] Received hosts:', JSON.stringify(eventData.hosts, null, 2))
      setEvent(eventData)
    } catch (err: any) {
      console.error('Error fetching event:', err)
      setMessage(`Error: ${err.message || 'Failed to fetch event'}`)
    }
  }

  useEffect(() => {
    if (!eventId) return

    let cancelled = false

    ;(async () => {
      try {
        await fetchEvent()
        if (cancelled) return

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
      setMessage(`Status updated to ${STATUS_LABEL[next]}`)
    } else {
      const errorText = await res.text()
      console.error('Failed to update status:', errorText)
      setMessage(`Failed to update status: ${errorText}`)
    }
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
      comments: newGuest.comments.trim(),
    }
    const { data, error } = await supabase
      .from('guests')
      .insert([payload])
      .select('id,event_id,full_name,email,status,plus_ones,comments')
      .single()
    if (error) { setMessage(error.message); return }
    setGuests(prev => [...prev, data as Guest].sort((a,b)=>a.full_name.localeCompare(b.full_name)))
    setIsAdding(false)
    setNewGuest({ full_name:'', email:'', status:'PENDING', plus_ones:0, comments:'' })
    setMessage('Guest added.')
  }

  // EDIT EVENT (image stays client-side upload; row update goes through API with token)
  function openEditEvent() {
    if (!event) return
    setModalError(null)
    // Support both legacy (name) and new (title) field names
    setEvName(event.title ?? event.name ?? '')
    setEvTimezone(event.timezone ?? 'America/New_York')
    // Support both legacy (starts_at) and new (start_date) field names
    const startDate = event.start_date ?? event.starts_at ?? ''
    setEvStartDate(formatUSDate(startDate))
    setEvStartTime(formatTime12Hour(startDate) || '12:00 PM')
    const endDate = event.end_date ?? ''
    setEvEndDate(endDate ? formatUSDate(endDate) : '')
    setEvEndTime(endDate ? formatTime12Hour(endDate) : '3:00 PM')
    setEvEventUrl(event.event_url ?? '')
    setEvImageUrl(event.image_url ?? '')
    setNewImageFile(null)
    const loadedHosts = Array.isArray(event.hosts) ? [...event.hosts] : []
    const loadedSponsors = Array.isArray(event.sponsors) ? [...event.sponsors] : []
    // DEBUG: Log what's being loaded into edit form
    console.log('[FRONTEND EDIT OPEN] Loading sponsors into form:', JSON.stringify(loadedSponsors, null, 2))
    console.log('[FRONTEND EDIT OPEN] Loading hosts into form:', JSON.stringify(loadedHosts, null, 2))
    setHosts(loadedHosts)
    setSponsors(loadedSponsors)
    setEvIsPrivate(event.is_private ?? false)
    setEvApproveMode(event.approve_mode ?? 'MANUAL')
    setEvStatus(event.status ?? 'DRAFT')
    // Handle location - support both object and legacy string/city
    const loc = typeof event.location === 'object' ? event.location : null
    setEvLocationVenue(loc?.venue_name ?? '')
    setEvLocationStreet(loc?.street_address ?? '')
    setEvLocationCity(loc?.city ?? event.city ?? (typeof event.location === 'string' ? event.location : '') ?? '')
    setEvLocationState(loc?.state_province ?? '')
    setEvLocationCountry(loc?.country ?? 'USA')
    setIsEditingEvent(true)
  }
  function closeEditEvent() { setIsEditingEvent(false) }

  function openCreateEvent() {
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
    setIsCreatingEvent(true)
  }

  function closeCreateEvent() { setIsCreatingEvent(false) }

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

      if (!evStartDate.trim()) {
        setModalError('Start date is required')
        setSaving(false)
        return
      }

      const startIso = combineToISO(evStartDate, evStartTime)
      if (!startIso) {
        setModalError('Invalid start date or time')
        setSaving(false)
        return
      }

      const endIso = evEndDate.trim() ? combineToISO(evEndDate, evEndTime) : null
      if (evEndDate.trim() && !endIso) {
        setModalError('Invalid end date or time')
        setSaving(false)
        return
      }

      let nextImageUrl = evImageUrl
      const uploaded = await uploadEventImageIfNeeded(0)
      if (uploaded) nextImageUrl = uploaded

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
          image_url: nextImageUrl || null,
          event_url: evEventUrl.trim() || null,
          hosts: hosts
            .map(h => ({ name: (h.name ?? '').trim(), url: (h.url ?? '').trim() || null }))
            .filter(h => h.name.length > 0),
          sponsors: sponsors
            .map(s => ({
              title: (s.title ?? '').trim(),
              subtitle: (s.subtitle ?? '').trim() || undefined,
              url: (s.url ?? '').trim() || undefined,
              logo_url: (s.logo_url ?? '').trim() || undefined,
              description: (s.description ?? '').trim() || undefined,
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

      // Navigate to the new event or refresh
      if (json.event_id) {
        window.location.href = `/dashboard/${json.event_id}`
      } else {
        closeCreateEvent()
      }
    } catch (err: any) {
      setModalError(err?.message ?? 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  function updateHost(idx: number, patch: Partial<Host>) {
    setHosts(prev => prev.map((h,i)=> i===idx ? { ...h, ...patch } : h))
  }
  function addHost() { setHosts(prev => [...prev, { name: '', url: '' }]) }
  function removeHost(idx: number) { setHosts(prev => prev.filter((_,i)=> i!==idx)) }
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
    setSponsors(prev => prev.map((s,i)=> i===idx ? { ...s, ...patch } : s))
  }
  function addSponsor() { setSponsors(prev => [...prev, { title: '', subtitle: '', url: '', logo_url: '', description: '' }]) }
  function removeSponsor(idx: number) { setSponsors(prev => prev.filter((_,i)=> i!==idx)) }
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

  async function uploadEventImageIfNeeded(evId: string | number): Promise<string | null> {
    if (!newImageFile) return null

    // Upload to Azure Blob Storage via API route
    const formData = new FormData()
    formData.append('file', newImageFile)
    formData.append('eventId', String(evId))

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

  async function saveEvent() {
    if (!event) return
    setSaving(true)
    setModalError(null)
    try {
      if (!evStartDate.trim()) {
        setModalError('Start date is required')
        setSaving(false)
        return
      }

      const startIso = combineToISO(evStartDate, evStartTime)
      if (!startIso) {
        setModalError('Invalid start date or time')
        setSaving(false)
        return
      }

      const endIso = evEndDate.trim() ? combineToISO(evEndDate, evEndTime) : null
      if (evEndDate.trim() && !endIso) {
        setModalError('Invalid end date or time')
        setSaving(false)
        return
      }

      let nextImageUrl = evImageUrl
      const uploaded = await uploadEventImageIfNeeded(event.id)
      if (uploaded) nextImageUrl = uploaded

      // Build location object from individual fields
      const locationObj = {
        venue_name: evLocationVenue.trim() || undefined,
        street_address: evLocationStreet.trim() || undefined,
        city: evLocationCity.trim() || undefined,
        state_province: evLocationState.trim() || undefined,
        country: evLocationCountry.trim() || undefined,
      }
      // Only include location if at least one field is set
      const hasLocation = Object.values(locationObj).some(v => v)

      const payload = {
        id: event.id,
        title: evName.trim(),
        location: hasLocation ? locationObj : null,
        start_date: startIso,
        end_date: endIso,
        timezone: evTimezone.trim() || null,
        image_url: nextImageUrl || null,
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

      // DEBUG: Log payload before sending
      console.log('[FRONTEND UPDATE] Payload sponsors:', JSON.stringify(payload.sponsors, null, 2));
      console.log('[FRONTEND UPDATE] Payload hosts:', JSON.stringify(payload.hosts, null, 2));

      const res = await fetch('/api/events/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update event')

      // Refetch the event to get updated data (especially image_url)
      await fetchEvent()
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
      <main className="p-6 bg-slate-950 text-slate-100" style={{ backgroundColor: '#020617', color: '#f1f5f9' }}>
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
    <main className="p-6 w-full space-y-6 bg-slate-950 text-slate-100" style={{ backgroundColor: '#020617', color: '#f1f5f9' }}>
      {/* HEADER */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {event.image_url ? (
            <img src={event.image_url} alt="Event" className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg border border-dashed border-slate-700 shrink-0 flex items-center justify-center text-slate-500 text-xs">No image</div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight truncate" title={event.title ?? event.name}>{event.title ?? event.name}</h1>
            <p className="text-sm text-slate-400 truncate">
              {event.city ?? (typeof event.location === 'object' ? event.location?.city : event.location) ?? '—'} · {new Date(event.start_date ?? event.starts_at ?? '').toLocaleString()} · {event.timezone ?? '—'}
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
              {Array.isArray(event.sponsors) && event.sponsors.length > 0 && (
                <span className="truncate">
                  <span className="text-slate-400">Sponsors:</span>{' '}
                  {event.sponsors.map((s, i) => (
                    <span key={`${s.title}-${i}`}>
                      {s.url ? (<a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-100">{s.title}</a>) : (<span>{s.title}</span>)}
                      {i < event.sponsors!.length - 1 ? ', ' : ''}
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
          <Link href="/dashboard" className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">← Back to Events</Link>
          <button onClick={openEditEvent} className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">Edit event</button>
          <button onClick={openCreateEvent} className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">New Event</button>
          <label className="whitespace-nowrap px-4 py-2 rounded border cursor-pointer hover:bg-slate-900">
            Re-upload CSV
            <input type="file" accept=".csv,.txt" className="hidden" />
          </label>
          <Link href={`/checkin/${event.id}`} className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900">Check-in</Link>
        </div>
      </header>

      {/* CONFIRMED HEADCOUNT */}
      <section className="space-y-2">
        <div className="flex items-center gap-6 text-sm">
          <div>Confirmed (Approved) headcount: <span className="font-medium">{totals.confirmedHeadcount}</span></div>
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
          <input required value={newGuest.full_name} onChange={e=>setNewGuest(s=>({...s,full_name:e.target.value}))} placeholder="Full name" className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-2" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
          <input required type="email" value={newGuest.email} onChange={e=>setNewGuest(s=>({...s,email:e.target.value}))} placeholder="Email" className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-2" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
          <select value={newGuest.status} onChange={e=>setNewGuest(s=>({...s,status:e.target.value as NeonStatus}))} className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-2" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
            {(Object.keys(STATUS_LABEL) as NeonStatus[]).map(s=> <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <div className="flex items-center gap-2 md:col-span-2">
            <label className="text-sm text-slate-300">Plus-ones</label>
            <button type="button" className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>setNewGuest(s=>({...s,plus_ones: Math.max(0,s.plus_ones-1)}))}>−</button>
            <span className="min-w-6 text-center">{newGuest.plus_ones}</span>
            <button type="button" className="px-2 py-1 rounded border hover:bg-slate-900" onClick={()=>setNewGuest(s=>({...s,plus_ones: s.plus_ones+1}))}>＋</button>
          </div>
          <input value={newGuest.comments} onChange={e=>setNewGuest(s=>({...s,comments:e.target.value}))} placeholder="Comments (e.g., invited by …)" className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-4" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-3 py-2 rounded border bg-blue-700 hover:bg-blue-600">Save</button>
          </div>
        </form>
      )}

      {/* CONTROLS */}
      <section className="flex gap-3 items-center">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email…" className="flex-1 p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
        <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
          <option value="name">Sort: name</option>
          <option value="status">Sort: status</option>
          <option value="plus_ones">Sort: plus-ones</option>
        </select>
      </section>

      {/* TABLE */}
      <section className="border rounded overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[1800px]">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="text-left p-2 w-48">Name</th>
              <th className="text-left p-2 w-56">Email</th>
              <th className="text-left p-2 w-56">Company Website</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Plus-ones</th>
              <th className="text-left p-2 w-72">Comments</th>
              <th className="text-left p-2 w-64">Goals</th>
              <th className="text-left p-2 w-64">Looking For</th>
              <th className="text-left p-2 w-32">Owner ID</th>
              <th className="text-left p-2">Visibility</th>
              <th className="text-left p-2">Notifications</th>
              <th className="text-left p-2">Created At</th>
              <th className="text-left p-2">Updated At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={13} className="p-4 text-center text-slate-400">No guests found.</td></tr>
            )}
            {filtered.map(g=>(
              <tr key={g.id} className="border-t border-slate-800">
                <td className="p-2 w-48 truncate" title={g.full_name}>{g.full_name}</td>
                <td className="p-2 w-56 truncate">{g.email}</td>
                <td className="p-2 w-56 text-slate-300 truncate" title={g.company_website ?? '—'}>
                  {g.company_website ? <a href={g.company_website} target="_blank" rel="noreferrer" className="underline hover:text-slate-100">{g.company_website}</a> : '—'}
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
                <td className="p-2 w-72">
                  <input
                    value={g.comments ?? ''}
                    readOnly
                    onClick={() => { setCommentGuest(g); setCommentDraft(g.comments ?? '') }}
                    placeholder="Add a note…"
                    className="w-full p-1 rounded border bg-slate-900 text-slate-100 cursor-pointer"
                    style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                    title={g.comments ?? ''}
                  />
                </td>
                <td className="p-2 w-64 text-slate-300 truncate" title={g.goals ?? ''}>{g.goals ?? '—'}</td>
                <td className="p-2 w-64 text-slate-300 truncate" title={g.looking_for ?? ''}>{g.looking_for ?? '—'}</td>
                <td className="p-2 w-32 text-slate-400 text-xs font-mono truncate" title={g.owner_id}>{g.owner_id}</td>
                <td className="p-2 text-center">{g.visibility_enabled ? <span className="text-green-400">✓</span> : <span className="text-slate-600">✗</span>}</td>
                <td className="p-2 text-center">{g.notifications_enabled ? <span className="text-green-400">✓</span> : <span className="text-slate-600">✗</span>}</td>
                <td className="p-2 text-slate-400 text-xs">{g.created_at ? new Date(g.created_at).toLocaleString() : '—'}</td>
                <td className="p-2 text-slate-400 text-xs">{g.updated_at ? new Date(g.updated_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Comments Modal */}
      {commentGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeCommentModal} />
          <div className="relative z-10 w-[min(800px,92vw)] max-h-[88vh] bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Edit note — {commentGuest.full_name}</h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeCommentModal}>Close (Esc)</button>
            </div>
            <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} rows={10} className="w-full p-3 rounded border bg-slate-900 text-slate-100 resize-y" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="Type your note…" />
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
          <div className="relative z-10 w-[min(900px,95vw)] max-h-[92vh] overflow-auto bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit event</h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeEditEvent}>Close</button>
            </div>

            {modalError && <div className="text-sm text-red-300 border border-red-500/40 bg-red-900/20 rounded p-2">{modalError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm md:col-span-2">
                Event title <span className="text-red-400">*</span>
                <input value={evName} onChange={e=>setEvName(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} required />
              </label>

              <label className="text-sm">Event status
                <select value={evStatus} onChange={e=>setEvStatus(e.target.value as EventStatus)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>

              <label className="text-sm">Guest approval mode
                <select value={evApproveMode} onChange={e=>setEvApproveMode(e.target.value as ApproveMode)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTO">Auto</option>
                </select>
              </label>

              <label className="text-sm flex items-center gap-2 mt-6 md:col-span-2">
                <input type="checkbox" checked={evIsPrivate} onChange={e=>setEvIsPrivate(e.target.checked)} className="w-4 h-4" />
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

              <label className="text-sm">Timezone
                <select value={evTimezone} onChange={e=>setEvTimezone(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm md:col-span-2">Event link (Luma / Eventbrite / site)
                <input value={evEventUrl} onChange={e=>setEvEventUrl(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="https://…" />
              </label>

              {/* Location */}
              <div className="md:col-span-2">
                <div className="text-sm font-medium mb-2">Location</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm">Venue name
                    <input value={evLocationVenue} onChange={e=>setEvLocationVenue(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="Conference center, hotel, etc." />
                  </label>
                  <label className="text-sm">Street address
                    <input value={evLocationStreet} onChange={e=>setEvLocationStreet(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="123 Main St" />
                  </label>
                  <label className="text-sm">City
                    <input value={evLocationCity} onChange={e=>setEvLocationCity(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="San Francisco" />
                  </label>
                  <label className="text-sm">State
                    <select value={evLocationState} onChange={e=>setEvLocationState(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
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
                <div className="space-y-3">
                  {hosts.map((h, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex flex-col gap-1 pt-3">
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveHostUp(idx)} disabled={idx === 0} title="Move up">↑</button>
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveHostDown(idx)} disabled={idx === hosts.length - 1} title="Move down">↓</button>
                      </div>
                      <div className="flex-1 p-3 border border-slate-700 rounded space-y-2">
                        <input value={h.name ?? ''} onChange={e=>updateHost(idx,{name:e.target.value})} placeholder="Host name" className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                        <input value={h.url ?? ''} onChange={e=>updateHost(idx,{url:e.target.value})} placeholder="Profile URL (optional)" className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                        <div className="flex justify-end">
                          <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={()=>removeHost(idx)}>Remove</button>
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
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveSponsorUp(idx)} disabled={idx === 0} title="Move up">↑</button>
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveSponsorDown(idx)} disabled={idx === sponsors.length - 1} title="Move down">↓</button>
                      </div>
                      <div className="flex-1 p-3 border border-slate-700 rounded space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <input value={s.title ?? ''} onChange={e=>{
                              const val = e.target.value
                              if (val.length <= 60) updateSponsor(idx,{title:val})
                            }} placeholder="Sponsor name" maxLength={60} className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                            <div className="text-xs text-slate-400 mt-1">{(s.title ?? '').length} / 60 characters</div>
                          </div>
                          <div>
                            <input value={s.subtitle ?? ''} onChange={e=>{
                              const val = e.target.value
                              if (val.length <= 80) updateSponsor(idx,{subtitle:val})
                            }} placeholder="Subtitle (optional)" maxLength={80} className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                            <div className="text-xs text-slate-400 mt-1">{(s.subtitle ?? '').length} / 80 characters</div>
                          </div>
                        </div>

                        <div>
                          <input value={s.url ?? ''} onChange={e=>updateSponsor(idx,{url:e.target.value})} placeholder="Sponsor website / link (optional)" className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
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
                            onChange={e=>updateSponsor(idx,{description:e.target.value})}
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
                                    formData.append('eventId', String(event?.id ?? 0))
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
                          <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={()=>removeSponsor(idx)}>Remove sponsor</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={addSponsor}>+ Add sponsor</button>
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

      {/* Create Event Modal */}
      {isCreatingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create event</h2>
              <button className="px-3 py-1 rounded border hover:bg-slate-800" onClick={closeCreateEvent}>Close</button>
            </div>

            {modalError && <div className="text-sm text-red-300 border border-red-500/40 bg-red-900/20 rounded p-2">{modalError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm md:col-span-2">
                Event title <span className="text-red-400">*</span>
                <input value={evName} onChange={e=>setEvName(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} required />
              </label>

              <label className="text-sm">Event status
                <select value={evStatus} onChange={e=>setEvStatus(e.target.value as EventStatus)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>

              <label className="text-sm">Guest approval mode
                <select value={evApproveMode} onChange={e=>setEvApproveMode(e.target.value as ApproveMode)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTO">Auto</option>
                </select>
              </label>

              <label className="text-sm flex items-center gap-2 mt-6 md:col-span-2">
                <input type="checkbox" checked={evIsPrivate} onChange={e=>setEvIsPrivate(e.target.checked)} className="w-4 h-4" />
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
                <select value={evTimezone} onChange={e=>setEvTimezone(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm md:col-span-2">Event link (Luma / Eventbrite / site)
                <input value={evEventUrl} onChange={e=>setEvEventUrl(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="https://…" />
              </label>

              {/* Location */}
              <div className="md:col-span-2">
                <div className="text-sm font-medium mb-2">Location</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm">Venue name
                    <input value={evLocationVenue} onChange={e=>setEvLocationVenue(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="Conference center, hotel, etc." />
                  </label>
                  <label className="text-sm">Street address
                    <input value={evLocationStreet} onChange={e=>setEvLocationStreet(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="123 Main St" />
                  </label>
                  <label className="text-sm">City
                    <input value={evLocationCity} onChange={e=>setEvLocationCity(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} placeholder="San Francisco" />
                  </label>
                  <label className="text-sm">State
                    <select value={evLocationState} onChange={e=>setEvLocationState(e.target.value)} className="mt-1 w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
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
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveHostUp(idx)} disabled={idx === 0} title="Move up">↑</button>
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveHostDown(idx)} disabled={idx === hosts.length - 1} title="Move down">↓</button>
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border border-slate-700 rounded">
                        <input value={h.name ?? ''} onChange={e=>updateHost(idx,{name:e.target.value})} placeholder="Host name" className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-2" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                        <input value={h.url ?? ''} onChange={e=>updateHost(idx,{url:e.target.value})} placeholder="Profile URL (optional)" className="p-2 rounded border bg-slate-900 text-slate-100 md:col-span-2" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                        <div className="md:col-span-1 flex justify-end">
                          <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={()=>removeHost(idx)}>Remove</button>
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
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveSponsorUp(idx)} disabled={idx === 0} title="Move up">↑</button>
                        <button type="button" className="px-2 py-1 rounded border hover:bg-slate-800 text-xs" onClick={()=>moveSponsorDown(idx)} disabled={idx === sponsors.length - 1} title="Move down">↓</button>
                      </div>
                      <div className="flex-1 p-3 border border-slate-700 rounded space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <input value={s.title ?? ''} onChange={e=>{
                              const val = e.target.value
                              if (val.length <= 60) updateSponsor(idx,{title:val})
                            }} placeholder="Sponsor name" maxLength={60} className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                            <div className="text-xs text-slate-400 mt-1">{(s.title ?? '').length} / 60 characters</div>
                          </div>
                          <div>
                            <input value={s.subtitle ?? ''} onChange={e=>{
                              const val = e.target.value
                              if (val.length <= 80) updateSponsor(idx,{subtitle:val})
                            }} placeholder="Subtitle (optional)" maxLength={80} className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
                            <div className="text-xs text-slate-400 mt-1">{(s.subtitle ?? '').length} / 80 characters</div>
                          </div>
                        </div>

                        <div>
                          <input value={s.url ?? ''} onChange={e=>updateSponsor(idx,{url:e.target.value})} placeholder="Sponsor website / link (optional)" className="w-full p-2 rounded border bg-slate-900 text-slate-100" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }} />
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
                            onChange={e=>updateSponsor(idx,{description:e.target.value})}
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
                          <button type="button" className="px-3 py-2 rounded border hover:bg-slate-800" onClick={()=>removeSponsor(idx)}>Remove sponsor</button>
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

      {message && <p className="text-center text-sm text-amber-300">{message}</p>}
    </main>
  )
}
