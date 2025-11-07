import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

type Host = { name: string; url?: string | null }
type NewGuest = {
  full_name: string
  email: string
  status?: 'invite_sent' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in'
  plus_ones?: number
  priority?: 'normal' | 'vip' | 'vvip'
  comments?: string | null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const event = body.event as {
      name: string
      city?: string | null
      starts_at: string
      timezone: string
      capacity?: number | null
      image_url?: string | null
      event_url?: string | null
      hosts?: Host[]
    }

    const stagedGuests = (body.guests ?? []) as NewGuest[]

    const hostName = event.hosts?.[0]?.name ?? '—'

    // 1) create event row
    const { data: inserted, error: evErr } = await supabaseAdmin
      .from('events')
      .insert([{
        name: event.name,
        city: event.city ?? null,
        starts_at: event.starts_at,
        timezone: event.timezone,
        capacity: event.capacity ?? null,
        image_url: event.image_url ?? null,
        event_url: event.event_url ?? null,
        hosts: event.hosts ?? [],     // if you have a jsonb column `hosts`
        host_name: hostName           // legacy NOT NULL column
      }])
      .select('id')
      .single()

    if (evErr) throw evErr
    const eventId = inserted.id as string

    // 2) import guests (if any staged)
    if (stagedGuests.length) {
      // enforce defaults
      const rows = stagedGuests.map(g => ({
        event_id: eventId,
        full_name: g.full_name,
        email: g.email,
        status: normalizeStatus(g.status),
        plus_ones: Math.max(0, Number(g.plus_ones ?? 0)),
        priority: normalizePriority(g.priority),
        comments: g.comments ?? null
      }))

      // Chunked insert to stay under limits
      const chunkSize = 500
      for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize)
        const { error: insErr } = await supabaseAdmin.from('guests').insert(slice)
        if (insErr) throw insErr
      }
    }

    return NextResponse.json({ id: eventId })
  } catch (err: any) {
    console.error('create event error', err)
    return NextResponse.json({ error: err.message ?? 'Create failed' }, { status: 400 })
  }
}

// helpers
function normalizeStatus(s?: string) {
  const v = (s ?? '').toLowerCase().replace('-', '_')
  if (['invite_sent', 'confirmed', 'waitlist', 'cancelled', 'checked_in'].includes(v)) return v
  if (v === 'invited') return 'invite_sent'
  if (v === 'checkedin') return 'checked_in'
  return 'invite_sent'
}
function normalizePriority(p?: string) {
  const v = (p ?? '').toLowerCase()
  if (v === 'vip' || v === 'vvip') return v
  return 'normal'
}
