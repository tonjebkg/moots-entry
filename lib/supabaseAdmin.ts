// /lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

// Guard: Skip Supabase initialization when building/running dashboard
const isDashboardMode = process.env.NEXT_PUBLIC_APP_MODE === 'dashboard';

// Check if Supabase config is available
const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasFullConfig = hasSupabaseUrl && hasSupabaseKey;

// Only create client if not in dashboard mode AND we have full config
export const supabaseAdmin = (!isDashboardMode && hasFullConfig)
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  : null as any; // Dashboard mode or missing config - routes will handle gracefully
