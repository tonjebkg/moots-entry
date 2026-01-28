'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Guard: Prevent execution in dashboard mode
const isDashboardMode = process.env.NEXT_PUBLIC_APP_MODE === 'dashboard';

export async function listEvents() {
  if (isDashboardMode) {
    throw new Error('listEvents not available in dashboard mode');
  }

  const { data, error } = await supabase
    .from('events')
    .select('id, name, city, timezone, starts_at, capacity') // <-- add timezone here
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data ?? []
}

export async function createEvent(formData: FormData) {
  if (isDashboardMode) {
    throw new Error('createEvent not available in dashboard mode');
  }
  const payload = {
    name: String(formData.get('name') || '').trim(),
    city: String(formData.get('city') || '').trim() || null,
    timezone: String(formData.get('timezone') || 'America/Los_Angeles'),
    capacity: Number(formData.get('capacity') || 0) || null,
    starts_at: formData.get('starts_at')
      ? new Date(String(formData.get('starts_at'))).toISOString()
      : null,
    host_name: String(formData.get('host_name') || 'Moots AI'), // if NOT NULL in DB
  }

  if (!payload.name) throw new Error('Event name is required')

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw error

  revalidatePath('/')
  redirect(`/dashboard/${data.id}`)
}
