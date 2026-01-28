export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'

export default async function TestPage() {
  // Guard: Skip Supabase queries when in dashboard mode
  if (process.env.NEXT_PUBLIC_APP_MODE === 'dashboard') {
    return <div>Test page not available in dashboard mode</div>
  }

  const { data, error } = await supabase.from('events').select('*')
  console.log('DATA FROM SUPABASE:', data)
  console.log('ERROR:', error)
  return <div>Check your console (VS Code terminal or browser)</div>
}
