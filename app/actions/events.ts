'use server';

import { revalidatePath } from 'next/cache'; // <- not from 'next/navigation'
import { supabase } from '@/lib/supabase';

export async function createEvent(formData: FormData) {
  // ...
  revalidatePath('/');  // refresh homepage list
}

export async function listEvents() {
  const { data, error } = await supabase
    .from('events')
     .select('id, name, city, timezone, capacity, starts_at') 
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

export type Event = {
  id: string;
  name: string;
  city: string | null;
  timezone: string | null;
  capacity: number | null;
  starts_at: string | null;
};