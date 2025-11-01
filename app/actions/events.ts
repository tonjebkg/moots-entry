'use server';

import { supabase } from '@/lib/supabase';
import { redirect, revalidatePath } from 'next/navigation';

export async function createEvent(formData: FormData) {
  const payload = {
    name: String(formData.get('name') || '').trim(),
    city: String(formData.get('city') || '').trim() || null,
    timezone: String(formData.get('timezone') || 'America/Los_Angeles'),
    capacity: Number(formData.get('capacity') || 0) || null,
    starts_at: formData.get('starts_at')
      ? new Date(String(formData.get('starts_at'))).toISOString()
      : null,
  };

  if (!payload.name) throw new Error('Event name is required');

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;

  // show up on home & jump to dashboard
  revalidatePath('/');
  redirect(`/dashboard/${data.id}`);
}

export async function listEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, name, city, starts_at, capacity, timezone, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}
