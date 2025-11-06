// app/api/events/update/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role bypasses RLS
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { eventId, editToken, patch } = await req.json()

    if (!eventId || !editToken || !patch) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    // Verify token belongs to the event
    const { data: ev, error: evErr } = await supabaseAdmin
      .from('events')
      .select('id, edit_token')
      .eq('id', eventId)
      .single()

    if (evErr || !ev) {
      return NextResponse.json({ error: 'event not found' }, { status: 404 })
    }
    if (String(ev.edit_token) !== String(editToken)) {
      return NextResponse.json({ error: 'invalid token' }, { status: 403 })
    }

    // Only update allowed fields
    const allowed = {
      name: patch.name ?? null,
      city: patch.city ?? null,
      timezone: patch.timezone ?? null,
      starts_at: patch.starts_at ?? null,
      capacity: patch.capacity ?? null,
      image_url: patch.image_url ?? null,
      event_url: patch.event_url ?? null,
      hosts: patch.hosts ?? null,
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update(allowed)
      .eq('id', eventId)
      .select('id,name,city,starts_at,timezone,capacity,image_url,event_url,hosts,edit_token')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ event: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 })
  }
}

