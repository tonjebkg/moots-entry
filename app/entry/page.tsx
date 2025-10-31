'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Papa, { ParseResult } from 'papaparse'
import { v4 as uuidv4 } from 'uuid'

type HostLink = { name: string; url: string }
type ParsedGuest = { full_name: string; email: string }

export default function EntryPage() {
  const router = useRouter()

  // ---- form state ----
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [startsAt, setStartsAt] = useState('') // datetime-local
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [capacity, setCapacity] = useState<number | ''>('')
  const [eventLink, setEventLink] = useState('')

  const [hosts, setHosts] = useState<HostLink[]>([{ name: '', url: '' }])

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  const [guests, setGuests] = useState<ParsedGuest[]>([])
  const [parsing, setParsing] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // ---- helpers ----
  const cleanUrl = (u: string) => {
    const s = u.trim()
    if (!s) return ''
    try {
      const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
      // eslint-disable-next-line no-new
      new URL(withProto)
      return withProto
    } catch {
      return ''
    }
  }

  async function compressImage(file: File): Promise<Blob> {
    if (file.size <= 1_000_000) return file // <=1MB, skip
    const bitmap = await createImageBitmap(file)
    const maxW = 1600
    const scale = Math.min(1, maxW / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b || file), 'image/jpeg', 0.82)
    )
    return blob
  }

  async function uploadCover(file: File): Promise<string> {
    const blob = await compressImage(file)
    const key = `covers/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage
      .from('event-images')
      .upload(key, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('event-images').getPublicUrl(key)
    return data.publicUrl
  }

  const primaryHostName = useMemo(
    () => hosts.find((h) => h.name.trim())?.name.trim() || null,
    [hosts]
  )

  // ---- hosts handlers ----
  const handleAddHost = () => setHosts((hs) => [...hs, { name: '', url: '' }])
  const handleRemoveHost = (idx: number) =>
    setHosts((hs) => hs.filter((_, i) => i !== idx))
  const handleHostChange = (idx: number, key: keyof HostLink, val: string) =>
    setHosts((hs) => hs.map((h, i) => (i === idx ? { ...h, [key]: val } : h)))

  // ---- cover handler ----
  const handleCoverChange = (file: File | null) => {
    setCoverFile(file)
    setCoverUrl(null)
  }

  // ---- CSV/TXT upload ----
  function normalizeEmail(s: string) {
    return (s || '').trim().toLowerCase()
  }
  function normalizeName(s: string) {
    return (s || '').trim()
  }

  const handleGuestFile = (file?: File | null) => {
    if (!file) return
    setParsing(true)
    setGuests([])
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res: ParseResult<Record<string, string>>) => {
        try {
          const rows = (res.data || [])
            .map((r) => ({
              full_name: normalizeName(
                r.full_name || r.name || (r['Full Name'] as any) || ''
              ),
              email: normalizeEmail(r.email || (r.Email as any) || (r['e-mail'] as any) || ''),
            }))
            .filter((x) => x.full_name && x.email)
          setGuests(rows)
          setMsg(`Guest list parsed: ${rows.length} guests`)
        } catch (e: any) {
          setMsg(`Failed to parse file: ${e?.message || 'unknown error'}`)
        } finally {
          setParsing(false)
        }
      },
      error: (err) => {
        setMsg(`Parse error: ${err.message}`)
        setParsing(false)
      },
    })
  }

  // ---- submit ----
  const handleCreate = async () => {
    setMsg(null)
    if (!name.trim()) return setMsg('Please add an event name.')
    if (!startsAt) return setMsg('Please choose a date & time.')

    setSubmitting(true)
    try {
      // 1) optional cover upload
      let uploadedCoverUrl: string | null = null
      if (coverFile) {
        uploadedCoverUrl = await uploadCover(coverFile)
        setCoverUrl(uploadedCoverUrl)
      }

      // 2) clean hosts & link
      const host_links = hosts
        .map((h) => ({ name: h.name.trim(), url: cleanUrl(h.url) }))
        .filter((h) => h.name || h.url)

      // 3) insert event
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .insert({
          name: name.trim(),
          city: city.trim() || null,
          starts_at: new Date(startsAt).toISOString(),
          timezone: timezone.trim() || null,
          capacity: capacity === '' ? null : Number(capacity),
          host_name: primaryHostName,
          host_links, // jsonb
          event_link: cleanUrl(eventLink) || null,
          cover_url: uploadedCoverUrl,
        })
        .select('id')
        .single()

      if (evErr || !ev?.id) throw evErr || new Error('Event insert failed')
      const eventId = ev.id as string

      // 4) insert guests (optional but likely)
      if (guests.length > 0) {
        const rows = guests.map((g) => ({
          event_id: eventId,
          full_name: g.full_name,
          email: g.email,
          token: uuidv4(),
          status: 'invited',
          plus_ones: 0,
        }))

        const { error: gErr } = await supabase.from('guests').insert(rows)
        if (gErr) throw gErr
      }

      setMsg('Event created ✅')
      router.push(`/dashboard/${eventId}`)
    } catch (err: any) {
      setMsg(`Failed to create event: ${err?.message || 'unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- UI ----
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create an event</h1>
      </header>

      <section className="rounded-xl border border-gray-800 bg-black/40 p-5 space-y-6">
        {/* Basics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">Event name *</span>
            <input
              className="px-3 py-2 rounded border bg-black/30 border-gray-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AI Collective Breakfast"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">City</span>
            <input
              className="px-3 py-2 rounded border bg-black/30 border-gray-800"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Francisco"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">Date & time *</span>
            <input
              type="datetime-local"
              className="px-3 py-2 rounded border bg-black/30 border-gray-800"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">Timezone</span>
            <input
              className="px-3 py-2 rounded border bg-black/30 border-gray-800"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/Los_Angeles"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">Capacity</span>
            <input
              type="number"
              min={0}
              className="px-3 py-2 rounded border bg-black/30 border-gray-800"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : '')}
              placeholder="100"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">Event link (Luma, Eventbrite, etc.)</span>
            <input
              className="px-3 py-2 rounded border bg-black/30 border-gray-800"
              value={eventLink}
              onChange={(e) => setEventLink(e.target.value)}
              placeholder="https://lu.ma/your-event"
            />
          </label>
        </div>

        {/* Hosts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Hosts</span>
            <button
              type="button"
              className="px-3 py-1 text-sm rounded border border-gray-800 hover:bg-gray-900"
              onClick={handleAddHost}
            >
              + Add host
            </button>
          </div>

          <div className="space-y-2">
            {hosts.map((h, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input
                  className="md:col-span-5 px-3 py-2 rounded border bg-black/30 border-gray-800"
                  placeholder="Host name"
                  value={h.name}
                  onChange={(e) => handleHostChange(i, 'name', e.target.value)}
                />
                <input
                  className="md:col-span-6 px-3 py-2 rounded border bg-black/30 border-gray-800"
                  placeholder="Host website / link"
                  value={h.url}
                  onChange={(e) => handleHostChange(i, 'url', e.target.value)}
                />
                <div className="md:col-span-1">
                  {hosts.length > 1 && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 rounded border border-gray-800 hover:bg-gray-900"
                      onClick={() => handleRemoveHost(i)}
                      aria-label="Remove host"
                    >
                      −
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cover image */}
        <div className="space-y-2">
          <span className="text-sm text-gray-300">Event image (optional)</span>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleCoverChange(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-3
                         file:rounded file:border-0 file:text-sm file:bg-gray-900 file:text-gray-200
                         hover:file:bg-gray-800"
            />
            {coverUrl && (
              <a
                href={coverUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-400 hover:underline"
              >
                view
              </a>
            )}
          </div>
          <p className="text-xs text-gray-500">Large images are auto-compressed for faster loads.</p>
        </div>

        {/* Guest list upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Guest list (.csv or .txt)</span>
            {guests.length > 0 && (
              <span className="text-xs text-gray-400">{guests.length} guests detected</span>
            )}
          </div>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => handleGuestFile(e.target.files?.[0])}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-3
                       file:rounded file:border-0 file:text-sm file:bg-gray-900 file:text-gray-200
                       hover:file:bg-gray-800"
          />
          <p className="text-xs text-gray-500">
            Required columns: <code>full_name</code> (or <code>name</code>/<code>Full Name</code>) and{' '}
            <code>email</code>. We auto-detect headers and ignore empty rows.
          </p>
          {parsing && <p className="text-xs text-gray-400">Parsing…</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-400">{msg}</div>
          <button
            disabled={submitting}
            onClick={handleCreate}
            className="px-4 py-2 rounded border border-gray-700 bg-white/5 hover:bg白/10 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </section>
    </main>
  )
}
