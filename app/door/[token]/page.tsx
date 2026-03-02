'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  Search, UserPlus, CheckCircle, AlertCircle, X, QrCode, ChevronDown,
  MapPin, Calendar, Users, Loader2, Lock, Eye, EyeOff, RefreshCw
} from 'lucide-react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { formatUSTime, formatUSDateShort } from '@/lib/datetime'

// ─── Types ──────────────────────────────────────────────────────────────

interface EventInfo {
  id: number
  title: string
  start_date: string | null
  end_date: string | null
  location: { venue_name?: string; city?: string; state_province?: string; country?: string; street_address?: string } | string | null
  seating_format: string | null
  tables_config: { number: number; seats: number }[] | null
}

interface CheckinMetrics {
  total_expected: number
  total_checked_in: number
  walk_ins: number
  not_arrived: number
  check_in_rate: number
  recent_checkins: any[]
  not_arrived_guests: any[]
}

interface GuestRow {
  id: string
  contact_id: string | null
  full_name: string
  company: string | null
  title: string | null
  table_assignment: number | null
  assigned_team_member: string | null
  status: 'CHECKED_IN' | 'NOT_ARRIVED' | 'WALK_IN'
  checked_in_at: string | null
}

type ScanFeedback = {
  type: 'success' | 'already' | 'not_found'
  guest_name?: string
  company?: string
  table_assignment?: number | null
  checked_in_at?: string
} | null

// ─── Page ────────────────────────────────────────────────────────────────

export default function DoorViewPage() {
  const { token } = useParams<{ token: string }>()

  // State
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [metrics, setMetrics] = useState<CheckinMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  // PIN gate
  const [hasPin, setHasPin] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)

  // Guest list
  const [rows, setRows] = useState<GuestRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [checkingInIds, setCheckingInIds] = useState<Set<string>>(new Set())

  // QR Scanner
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null)
  const scanCooldown = useRef(false)

  // Walk-in
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [walkInForm, setWalkInForm] = useState({ full_name: '', email: '', company: '', title: '', phone: '' })
  const [walkInSubmitting, setWalkInSubmitting] = useState(false)

  // Bulk select (laptop only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function formatLocation(loc: EventInfo['location']): string | null {
    if (!loc) return null
    if (typeof loc === 'string') return loc
    const parts = [loc.venue_name, loc.city].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  const apiBase = `/api/door/${token}`

  // ─── Data Fetching ──────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(apiBase)
      if (res.status === 401) {
        setExpired(true)
        return
      }
      if (!res.ok) throw new Error('Failed to load')

      const data = await res.json()
      setEvent(data.event)
      setMetrics(data.metrics)
      setHasPin(data.has_pin)

      // Build unified row model
      const checkinRows: GuestRow[] = (data.metrics.recent_checkins || []).map((c: any) => ({
        id: c.id,
        contact_id: c.contact_id,
        full_name: c.full_name,
        company: c.company,
        title: c.title,
        table_assignment: c.table_assignment || null,
        assigned_team_member: c.assigned_team_member || null,
        status: c.source === 'WALK_IN' ? 'WALK_IN' as const : 'CHECKED_IN' as const,
        checked_in_at: c.created_at,
      }))

      const notArrivedRows: GuestRow[] = (data.metrics.not_arrived_guests || []).map((g: any) => ({
        id: `na-${g.contact_id}`,
        contact_id: g.contact_id,
        full_name: g.full_name,
        company: g.company,
        title: g.title,
        table_assignment: g.table_assignment,
        assigned_team_member: g.assigned_team_member || null,
        status: 'NOT_ARRIVED' as const,
        checked_in_at: null,
      }))

      setRows([...checkinRows, ...notArrivedRows])
    } catch {
      setError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll every 5s once PIN is verified (or no PIN required)
  useEffect(() => {
    if (expired || (hasPin && !pinVerified)) return
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData, expired, hasPin, pinVerified])

  // Auto-dismiss scan feedback
  useEffect(() => {
    if (!scanFeedback) return
    const timeout = setTimeout(() => setScanFeedback(null), 2500)
    return () => clearTimeout(timeout)
  }, [scanFeedback])

  // ─── PIN Verification ──────────────────────────────────────────────

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPinError(false)
    setPinLoading(true)
    try {
      const res = await fetch(`${apiBase}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      })
      const data = await res.json()
      if (data.valid) {
        setPinVerified(true)
      } else {
        setPinError(true)
        setPinInput('')
      }
    } catch {
      setPinError(true)
    } finally {
      setPinLoading(false)
    }
  }

  // ─── Check-in Action ──────────────────────────────────────────────

  async function handleCheckIn(contactId: string, rowId: string) {
    setCheckingInIds(prev => new Set(prev).add(rowId))
    try {
      const res = await fetch(`${apiBase}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
      })
      if (res.ok || res.status === 409) {
        const row = rows.find(r => r.id === rowId)
        setScanFeedback({
          type: res.status === 409 ? 'already' : 'success',
          guest_name: row?.full_name,
          company: row?.company || undefined,
          table_assignment: row?.table_assignment,
        })
        await fetchData()
      }
    } catch {
      setError('Check-in failed')
    } finally {
      setCheckingInIds(prev => {
        const next = new Set(prev)
        next.delete(rowId)
        return next
      })
    }
  }

  async function handleBulkCheckIn() {
    const toCheckIn = filteredRows.filter(r => selectedIds.has(r.id) && r.status === 'NOT_ARRIVED' && r.contact_id)
    for (const row of toCheckIn) {
      await handleCheckIn(row.contact_id!, row.id)
    }
    setSelectedIds(new Set())
  }

  // ─── QR Scan ──────────────────────────────────────────────────────

  async function handleScan(data: string) {
    if (scanCooldown.current) return
    scanCooldown.current = true
    setTimeout(() => { scanCooldown.current = false }, 2000)

    try {
      const res = await fetch(`${apiBase}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: data }),
      })
      const result = await res.json()

      if (result.status === 'checked_in') {
        setScanFeedback({
          type: 'success',
          guest_name: result.guest_name,
          company: result.company,
          table_assignment: result.table_assignment,
        })
        await fetchData()
      } else if (result.status === 'already_checked_in') {
        setScanFeedback({
          type: 'already',
          guest_name: result.guest_name,
          company: result.company,
          table_assignment: result.table_assignment,
          checked_in_at: result.checked_in_at,
        })
      } else {
        setScanFeedback({ type: 'not_found' })
      }
    } catch {
      setScanFeedback({ type: 'not_found' })
    }
  }

  // ─── Walk-in ──────────────────────────────────────────────────────

  async function handleWalkInSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWalkInSubmitting(true)
    try {
      const res = await fetch(`${apiBase}/walk-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: walkInForm.full_name,
          email: walkInForm.email || null,
          company: walkInForm.company || null,
          title: walkInForm.title || null,
          phone: walkInForm.phone || null,
        }),
      })
      if (res.ok) {
        setScanFeedback({ type: 'success', guest_name: walkInForm.full_name, company: walkInForm.company || undefined })
        setShowWalkIn(false)
        setWalkInForm({ full_name: '', email: '', company: '', title: '', phone: '' })
        await fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Walk-in failed')
      }
    } catch {
      setError('Walk-in failed')
    } finally {
      setWalkInSubmitting(false)
    }
  }

  // ─── Filtering ────────────────────────────────────────────────────

  const filteredRows = searchQuery.trim()
    ? rows.filter(r => {
        const q = searchQuery.toLowerCase()
        return r.full_name.toLowerCase().includes(q)
          || (r.company || '').toLowerCase().includes(q)
          || (r.title || '').toLowerCase().includes(q)
      })
    : rows

  // Sort: not-arrived first, then by name
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (a.status === 'NOT_ARRIVED' && b.status !== 'NOT_ARRIVED') return -1
    if (a.status !== 'NOT_ARRIVED' && b.status === 'NOT_ARRIVED') return 1
    return a.full_name.localeCompare(b.full_name)
  })

  // ─── Expired State ────────────────────────────────────────────────

  if (expired) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-brand-charcoal mb-2">Link Expired</h1>
          <p className="text-sm text-ui-tertiary">
            This check-in link is no longer valid. Please ask the event host for a new link.
          </p>
        </div>
      </div>
    )
  }

  // ─── Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-terracotta animate-spin" />
      </div>
    )
  }

  // ─── PIN Gate ─────────────────────────────────────────────────────

  if (hasPin && !pinVerified) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7 text-brand-terracotta" />
              </div>
              <h1 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-brand-charcoal">
                {event?.title || 'Event Check-in'}
              </h1>
              <p className="text-sm text-ui-tertiary mt-1">Enter PIN to access check-in</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError(false) }}
                  placeholder="Enter PIN"
                  autoFocus
                  className={`w-full px-4 py-3 text-center text-lg tracking-[0.3em] border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    pinError
                      ? 'border-red-300 focus:ring-red-200 bg-red-50'
                      : 'border-ui-border focus:ring-brand-terracotta/30 focus:border-brand-terracotta'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ui-tertiary hover:text-brand-charcoal"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {pinError && (
                <p className="text-sm text-red-600 text-center">Incorrect PIN. Try again.</p>
              )}
              <button
                type="submit"
                disabled={!pinInput || pinLoading}
                className="w-full py-3 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {pinLoading ? 'Verifying...' : 'Enter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (!event || !metrics) return null

  const seatingEnabled = event.seating_format && event.seating_format !== 'STANDING'
  const tables = event.tables_config || []

  // ─── Scan Feedback Overlay ────────────────────────────────────────

  const feedbackOverlay = scanFeedback && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
      <div className={`pointer-events-auto px-8 py-6 rounded-2xl shadow-2xl text-center max-w-sm mx-4 animate-[fadeIn_0.15s_ease-out] ${
        scanFeedback.type === 'success'
          ? 'bg-emerald-600 text-white'
          : scanFeedback.type === 'already'
          ? 'bg-amber-500 text-white'
          : 'bg-red-600 text-white'
      }`}>
        {scanFeedback.type === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <div className="text-lg font-semibold">{scanFeedback.guest_name}</div>
            {scanFeedback.company && <div className="text-sm opacity-90">{scanFeedback.company}</div>}
            {scanFeedback.table_assignment && (
              <div className="mt-2 text-sm font-medium bg-white/20 rounded-full px-3 py-1 inline-block">
                Table {scanFeedback.table_assignment}
              </div>
            )}
          </>
        )}
        {scanFeedback.type === 'already' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <div className="text-lg font-semibold">Already Checked In</div>
            {scanFeedback.guest_name && <div className="text-sm opacity-90">{scanFeedback.guest_name}</div>}
            {scanFeedback.checked_in_at && (
              <div className="text-sm opacity-80 mt-1">
                at {formatUSTime(new Date(scanFeedback.checked_in_at))}
              </div>
            )}
          </>
        )}
        {scanFeedback.type === 'not_found' && (
          <>
            <X className="w-12 h-12 mx-auto mb-3" />
            <div className="text-lg font-semibold">QR Code Not Recognized</div>
            <button
              onClick={() => { setScanFeedback(null); setShowWalkIn(true) }}
              className="pointer-events-auto mt-3 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
            >
              + Add as Walk-in
            </button>
          </>
        )}
      </div>
    </div>
  )

  // ─── Status Badge ─────────────────────────────────────────────────

  function StatusBadge({ row }: { row: GuestRow }) {
    if (row.status === 'NOT_ARRIVED') {
      return (
        <button
          onClick={() => row.contact_id && handleCheckIn(row.contact_id, row.id)}
          disabled={checkingInIds.has(row.id) || !row.contact_id}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 transition-colors disabled:opacity-50"
        >
          {checkingInIds.has(row.id) ? <Loader2 size={12} className="animate-spin" /> : null}
          {checkingInIds.has(row.id) ? 'Checking in...' : 'Not Arrived'}
        </button>
      )
    }
    if (row.status === 'CHECKED_IN') {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-[#2D6A4F] border border-emerald-200">
          Checked In
        </span>
      )
    }
    return (
      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-[#B05C3B] border border-amber-200">
        Walk-in
      </span>
    )
  }

  // ─── Avatar ───────────────────────────────────────────────────────

  function Avatar({ name, size = 32 }: { name: string; size?: number }) {
    const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    return (
      <div
        className="shrink-0 rounded-full bg-gradient-to-br from-brand-terracotta to-brand-forest flex items-center justify-center text-white font-semibold"
        style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      >
        {initials}
      </div>
    )
  }

  // ─── Event Header ─────────────────────────────────────────────────

  const eventHeader = (
    <div className="bg-white border-b border-ui-border">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-playfair)] text-lg sm:text-xl font-semibold text-brand-charcoal truncate">
              {event.title}
            </h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-ui-tertiary mt-0.5">
              {event.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  {formatUSDateShort(new Date(event.start_date))}
                </span>
              )}
              {formatLocation(event.location) && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin size={13} />
                  <span className="truncate">{formatLocation(event.location)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold text-brand-charcoal tabular-nums">
                {metrics.total_checked_in}
                <span className="text-ui-tertiary font-normal text-lg sm:text-xl"> / {metrics.total_expected + metrics.walk_ins}</span>
              </div>
              <div className="text-[11px] sm:text-xs text-ui-tertiary">checked in</div>
            </div>
            <div className="hidden sm:flex w-10 h-10 bg-brand-cream rounded-full items-center justify-center">
              <Users size={18} className="text-brand-terracotta" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Walk-in Modal ────────────────────────────────────────────────

  const walkInModal = showWalkIn && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-terracotta" />
            <h3 className="text-lg font-semibold text-brand-charcoal">Walk-in Registration</h3>
          </div>
          <button onClick={() => setShowWalkIn(false)} className="p-1 hover:bg-brand-cream rounded-lg transition-colors">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>

        <form onSubmit={handleWalkInSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={walkInForm.full_name}
              onChange={(e) => setWalkInForm({ ...walkInForm, full_name: e.target.value })}
              className="w-full px-3 py-2.5 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="Jane Smith"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Company</label>
              <input
                type="text"
                value={walkInForm.company}
                onChange={(e) => setWalkInForm({ ...walkInForm, company: e.target.value })}
                className="w-full px-3 py-2.5 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Title</label>
              <input
                type="text"
                value={walkInForm.title}
                onChange={(e) => setWalkInForm({ ...walkInForm, title: e.target.value })}
                className="w-full px-3 py-2.5 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                placeholder="VP Engineering"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Email</label>
            <input
              type="email"
              value={walkInForm.email}
              onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
              className="w-full px-3 py-2.5 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="jane@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Phone</label>
            <input
              type="tel"
              value={walkInForm.phone}
              onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
              className="w-full px-3 py-2.5 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              placeholder="+1 555 000 0000"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowWalkIn(false)}
              className="px-4 py-2.5 text-sm font-medium text-ui-tertiary hover:text-brand-charcoal transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={walkInSubmitting || !walkInForm.full_name}
              className="px-6 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {walkInSubmitting ? 'Adding...' : 'Add & Check In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  // ─── QR Scanner Modal (laptop) ────────────────────────────────────

  const scannerModal = scannerOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 lg:block hidden">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto mt-[10vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ui-border">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-terracotta" />
            <h3 className="font-semibold text-brand-charcoal">Scan QR Code</h3>
          </div>
          <button onClick={() => setScannerOpen(false)} className="p-1 hover:bg-brand-cream rounded-lg transition-colors">
            <X className="w-5 h-5 text-ui-tertiary" />
          </button>
        </div>
        <div className="aspect-square bg-black">
          <Scanner
            onScan={(result) => {
              if (result?.[0]?.rawValue) handleScan(result[0].rawValue)
            }}
            styles={{ container: { width: '100%', height: '100%' } }}
          />
        </div>
      </div>
    </div>
  )

  // ─── SMARTPHONE LAYOUT (< 640px) ──────────────────────────────────

  const phoneLayout = (
    <div className="sm:hidden flex flex-col h-[100dvh]">
      {eventHeader}

      {/* QR Scanner area */}
      <div className="relative bg-black" style={{ height: '35vh' }}>
        <Scanner
          onScan={(result) => {
            if (result?.[0]?.rawValue) handleScan(result[0].rawValue)
          }}
          styles={{ container: { width: '100%', height: '100%' } }}
        />
      </div>

      {/* Search + guest list */}
      <div className="flex-1 flex flex-col bg-brand-cream overflow-hidden">
        <div className="px-3 py-2 bg-white border-b border-ui-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guests..."
              className="w-full pl-9 pr-3 py-2.5 bg-brand-cream border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-ui-tertiary">
              {searchQuery ? 'No guests found' : 'No guests yet'}
            </div>
          ) : (
            <div className="divide-y divide-ui-border">
              {sortedRows.map(row => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-brand-cream/50 transition-colors"
                >
                  <Avatar name={row.full_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-brand-charcoal truncate">{row.full_name}</div>
                    <div className="text-xs text-ui-tertiary truncate">{row.company || ''}</div>
                  </div>
                  <StatusBadge row={row} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Walk-in button */}
      <button
        onClick={() => setShowWalkIn(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-5 py-3 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-full shadow-lg transition-colors"
      >
        <UserPlus size={18} />
        Walk-in
      </button>
    </div>
  )

  // ─── TABLET LAYOUT (640px–1024px) ─────────────────────────────────

  const tabletLayout = (
    <div className="hidden sm:flex lg:hidden flex-col h-[100dvh]">
      {eventHeader}

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scanner + search */}
        <div className="w-[40%] border-r border-ui-border flex flex-col bg-white">
          <div className="flex-1 bg-black">
            <Scanner
              onScan={(result) => {
                if (result?.[0]?.rawValue) handleScan(result[0].rawValue)
              }}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          </div>
          <div className="p-3 border-t border-ui-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guests..."
                className="w-full pl-9 pr-3 py-2.5 bg-brand-cream border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              />
            </div>
          </div>
        </div>

        {/* Right: Guest table */}
        <div className="w-[60%] flex flex-col overflow-hidden bg-brand-cream">
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-ui-border">
            <span className="text-sm font-medium text-ui-tertiary">{sortedRows.length} guests</span>
            <button
              onClick={() => setShowWalkIn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-full transition-colors"
            >
              <UserPlus size={14} />
              Add Walk-in
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-ui-border">
                  <th className="px-3 py-2 text-left font-semibold text-brand-charcoal">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-brand-charcoal">Company</th>
                  {seatingEnabled && <th className="px-3 py-2 text-left font-semibold text-brand-charcoal">Table</th>}
                  <th className="px-3 py-2 text-left font-semibold text-brand-charcoal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border bg-white">
                {sortedRows.map(row => (
                  <tr key={row.id} className="hover:bg-brand-cream/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.full_name} size={26} />
                        <span className="font-medium text-brand-charcoal truncate">{row.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-ui-secondary truncate">{row.company || '—'}</td>
                    {seatingEnabled && (
                      <td className="px-3 py-2.5 text-ui-secondary">{row.table_assignment ? `T${row.table_assignment}` : '—'}</td>
                    )}
                    <td className="px-3 py-2.5"><StatusBadge row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── LAPTOP LAYOUT (> 1024px) ─────────────────────────────────────

  const allSelected = sortedRows.length > 0 && sortedRows.every(r => selectedIds.has(r.id))

  const laptopLayout = (
    <div className="hidden lg:flex flex-col min-h-screen bg-brand-cream">
      {/* Top bar */}
      <div className="bg-white border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-brand-charcoal truncate">
              {event.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-ui-tertiary mt-0.5">
              {event.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatUSDateShort(new Date(event.start_date))}
                </span>
              )}
              {formatLocation(event.location) && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {formatLocation(event.location)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Live counter */}
            <div className="flex items-center gap-3 bg-brand-cream rounded-xl px-5 py-2.5">
              <Users size={20} className="text-brand-terracotta" />
              <div>
                <div className="text-2xl font-bold text-brand-charcoal tabular-nums">
                  {metrics.total_checked_in}
                  <span className="text-ui-tertiary font-normal text-base"> / {metrics.total_expected + metrics.walk_ins}</span>
                </div>
                <div className="text-[11px] text-ui-tertiary -mt-0.5">checked in</div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guests..."
                className="w-56 pl-9 pr-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              />
            </div>

            {/* QR Scanner toggle */}
            <button
              onClick={() => setScannerOpen(!scannerOpen)}
              className="flex items-center gap-2 px-4 py-2.5 border border-ui-border bg-white hover:bg-brand-cream text-sm font-medium text-brand-charcoal rounded-lg transition-colors"
            >
              <QrCode size={16} />
              Scan QR
            </button>

            {/* Walk-in */}
            <button
              onClick={() => setShowWalkIn(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-full transition-colors"
            >
              <UserPlus size={16} />
              Add Walk-in
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="flex items-center gap-3 bg-white border border-ui-border shadow-sm rounded-lg px-4 py-3">
            <span className="text-[13px] font-semibold text-brand-charcoal">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkCheckIn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-full transition-colors"
            >
              <CheckCircle size={13} />
              Check In Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[13px] text-ui-tertiary hover:text-brand-charcoal ml-auto"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="max-w-7xl mx-auto w-full px-6 py-4 flex-1">
        <div className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-cream border-b border-ui-border">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelectedIds(new Set())
                        else setSelectedIds(new Set(sortedRows.map(r => r.id)))
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Company</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Title</th>
                  {seatingEnabled && <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Table</th>}
                  <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Assigned To</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={seatingEnabled ? 8 : 7} className="px-4 py-12 text-center text-sm text-ui-tertiary">
                      {searchQuery ? `No guests matching "${searchQuery}"` : 'No guests yet'}
                    </td>
                  </tr>
                ) : sortedRows.map(row => (
                  <tr key={row.id} className="hover:bg-brand-cream/50 transition-colors">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => {
                          const next = new Set(selectedIds)
                          if (next.has(row.id)) next.delete(row.id)
                          else next.add(row.id)
                          setSelectedIds(next)
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.full_name} size={28} />
                        <span className="font-medium text-brand-charcoal">{row.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ui-secondary">{row.company || '—'}</td>
                    <td className="px-4 py-3 text-ui-secondary">{row.title || '—'}</td>
                    {seatingEnabled && (
                      <td className="px-4 py-3 text-ui-secondary">{row.table_assignment ? `Table ${row.table_assignment}` : '—'}</td>
                    )}
                    <td className="px-4 py-3 text-ui-secondary">{row.assigned_team_member || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge row={row} /></td>
                    <td className="px-4 py-3 text-ui-tertiary whitespace-nowrap">
                      {row.checked_in_at ? formatUSTime(new Date(row.checked_in_at)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <>
      {phoneLayout}
      {tabletLayout}
      {laptopLayout}
      {feedbackOverlay}
      {walkInModal}
      {scannerModal}

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg shadow-lg text-sm text-red-700 max-w-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-medium">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  )
}
