import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs' // ensure Node runtime (not edge) for form-data parsing

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const pathname = `event-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('events')            // bucket name: events
      .upload(pathname, Buffer.from(arrayBuffer), { upsert: false, contentType: file.type || 'image/jpeg' })

    if (uploadErr) throw uploadErr

    const { data: pub } = supabaseAdmin.storage.from('events').getPublicUrl(pathname)
    return NextResponse.json({ path: pathname, url: pub.publicUrl })
  } catch (err: any) {
    console.error('upload error', err)
    return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 })
  }
}
