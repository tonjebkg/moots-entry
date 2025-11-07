import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs' // ensure proper server environment

/**
 * PATCH /api/events/update
 * Updates an existing event (name, city, capacity, time, etc.)
 * Accepts JSON body:
 * {
 *   id: string,
 *   name?: string,
 *   city?: string,
 *   timezone?: string,
 *   starts_at?: string,
 *   capacity?: number,
 *   event_url?: string | null,
 *   image_url?: string | null,
 *   hosts?: { name: string; url?: string | null }[]
 * }
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
    }

    // Handle host_name fallback for old schema
    let hostName: string | null = null
    if (fields.hosts && Array.isArray(fields.hosts) && fields.hosts.length > 0) {
      hostName = fields.hosts[0]?.name ?? null
    }

    const updatePayload: any = {
      ...fields,
      host_name: hostName,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin
      .from('events')
      .update(updatePayload)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Update event error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to update event' }, { status: 400 })
  }
}

/**
 * POST /api/events/update
 * (Alias for backward compatibility — accepts the same body as PATCH)
 */
export async function POST(req: Request) {
  return PATCH(req)
}
