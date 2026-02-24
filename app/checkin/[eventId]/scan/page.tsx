'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Scanner } from '@yudiel/react-qr-scanner'

type Status = 'invited' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in'

type Guest = {
  id: string
  event_id: string
  full_name: string
  email: string
  status: Status
  token: string | null
  plus_ones: number | null
}

type EventRow = {
  id: string
  name: string
  capacity: number | null
  starts_at?: string | null
  timezone?: string | null
  city?: string | null
}

export default function ScanPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router = useRouter()

  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [scanning, setScanning] = useState(true)

  const isDashboardMode = process.env.NEXT_PUBLIC_APP_MODE === 'dashboard'

  // ---- Fetch event + guests ----
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId as string)
        .single()
      if (mounted) setEvent(ev as EventRow)

      const { data: gs } = await supabase
        .from('guests')
        .select('id,event_id,full_name,email,status,token,plus_ones')
        .eq('event_id', eventId as string)
        .order('full_name', { ascending: true })
      if (mounted) setGuests((gs || []) as Guest[])
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [eventId])

  // ---- Derived counters (plus-ones included) ----
  const { capacity, confirmedHeadcount, checkedInHeadcount } = useMemo(() => {
    const cap = event?.capacity ?? 0
    const confirmed = guests.reduce((n, g) => {
      if (g.status === 'confirmed') {
        const p = typeof g.plus_ones === 'number' ? g.plus_ones! : 0
        return n + 1 + Math.max(0, p)
      }
      return n
    }, 0)
    const checked = guests.reduce((n, g) => {
      if (g.status === 'checked_in') {
        const p = typeof g.plus_ones === 'number' ? g.plus_ones! : 0
        return n + 1 + Math.max(0, p)
      }
      return n
    }, 0)
    return { capacity: cap, confirmedHeadcount: confirmed, checkedInHeadcount: checked }
  }, [event?.capacity, guests])

  const normalizeEmail = (s: string) => (s || '').trim().toLowerCase()

  const refreshGuests = async () => {
    const { data: gs } = await supabase
      .from('guests')
      .select('id,event_id,full_name,email,status,token,plus_ones')
      .eq('event_id', eventId as string)
      .order('full_name', { ascending: true })
    setGuests((gs || []) as Guest[])
  }

  // ---- Helpers ----
  const upsertCheckin = async (guestId: string) => {
    await supabase.from('checkins').upsert(
      [{ event_id: eventId as string, guest_id: guestId, checked_in_at: new Date().toISOString() }],
      { onConflict: 'event_id,guest_id' }
    )
  }

  const deleteCheckin = async (guestId: string) => {
    await supabase
      .from('checkins')
      .delete()
      .eq('event_id', eventId as string)
      .eq('guest_id', guestId)
  }

  const setGuestStatus = (guestId: string, next: Status) => {
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, status: next } : g)))
  }

  // ---- Scan handler ----
  const handleScanText = async (raw: string) => {
    const text = (raw || '').trim()
    if (!text) return
    setScanning(false)
    try {
      let match: Guest | undefined = guests.find((g) => g.token === text)
      if (!match && text.includes('@')) {
        const email = normalizeEmail(text)
        match = guests.find((g) => normalizeEmail(g.email) === email)
      }

      if (!match) {
        setMessage(`Not on the list: “${text}”`)
        return
      }

      if (match.status === 'checked_in') {
        await deleteCheckin(match.id)
        await supabase.from('guests').update({ status: 'invited' }).eq('id', match.id)
        setGuestStatus(match.id, 'invited')
        setMessage(`Undo check-in for ${match.full_name}`)
      } else {
        await upsertCheckin(match.id)
        await supabase.from('guests').update({ status: 'checked_in' }).eq('id', match.id)
        setGuestStatus(match.id, 'checked_in')
        setMessage(`Checked-in: ${match.full_name}`)
      }

      await refreshGuests()
    } catch (err: any) {
      setMessage(`Scan failed: ${err?.message || 'unknown error'}`)
    } finally {
      setTimeout(() => setScanning(true), 600)
    }
  }

  const constraints = useMemo<MediaTrackConstraints>(
    () => ({ facingMode }),
    [facingMode]
  )

  const pct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0)

  // Guard: Skip Supabase usage when in dashboard mode
  if (isDashboardMode) {
    return <main className="p-6 text-white">QR scan page not available in dashboard mode</main>
  }

  if (loading) return <main className="p-6 text-gray-400">Loading...</main>

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{event?.name ?? 'Scan Check-in'}</h1>
          <p className="text-sm text-gray-400">
            Capacity: {capacity || 0} • Confirmed: {confirmedHeadcount} • Checked-in: {checkedInHeadcount}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/${event?.id}`} className="px-3 py-2 rounded border hover:bg-gray-900">
            Dashboard
          </Link>
          <Link href={`/checkin/${event?.id}`} className="px-3 py-2 rounded border hover:bg-gray-900">
            Check-in list
          </Link>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Confirmed</span>
            <span>
              {confirmedHeadcount}/{capacity}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded">
            <div className="h-2 bg-blue-500 rounded" style={{ width: `${pct(confirmedHeadcount, capacity)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Checked-in</span>
            <span>
              {checkedInHeadcount}/{capacity}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded">
            <div className="h-2 bg-green-500 rounded" style={{ width: `${pct(checkedInHeadcount, capacity)}%` }} />
          </div>
        </div>
      </div>

      {/* Scanner panel */}
      <div className="relative rounded-xl overflow-hidden border bg-black">
        <Scanner
          onScan={(codes) => {
            const first =
              codes?.[0]?.rawValue ??
              (codes?.[0] as any)?.raw ??
              (codes?.[0] as any)?.value ??
              ''
            if (first && scanning) void handleScanText(String(first))
          }}
          constraints={constraints}
          scanDelay={250}
          styles={{
            container: { width: '100%', minHeight: 520 },
            video: { width: '100%', height: '100%', objectFit: 'cover' },
          }}
          onError={(err) => setMessage(`Camera error: ${String(err)}`)}
        />

        {/* Flip camera */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            className="h-10 w-10 rounded-full border bg-black/60 hover:bg-black/80 backdrop-blur"
            title="Flip camera"
            onClick={() =>
              setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
            }
          >
            ↺
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="text-center text-sm bg-gray-900 border border-gray-800 rounded p-2 text-gray-300">
          {message}
        </div>
      )}

      {/* Footer tips */}
      <p className="text-xs text-gray-500">
        • Scan a guest’s QR to check in. Scanning the same guest again will undo the check-in. <br />
        • Flip the camera if needed. • Progress bars show confirmed vs. checked-in vs. capacity.
      </p>
    </main>
  )
}
