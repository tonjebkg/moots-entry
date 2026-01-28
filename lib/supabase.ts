import { createClient } from '@supabase/supabase-js';

// Guard: Skip Supabase initialization when building/running dashboard
const isDashboardMode = process.env.NEXT_PUBLIC_APP_MODE === 'dashboard';

export const supabase = isDashboardMode
  ? null as any // Dashboard doesn't use Supabase client
  : createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
