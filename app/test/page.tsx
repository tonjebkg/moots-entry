export const dynamic = 'force-dynamic'


import { supabase } from '@/lib/supabase'

export default async function TestPage() {
  const { data, error } = await supabase.from('events').select('*')
  console.log('DATA FROM SUPABASE:', data)
  console.log('ERROR:', error)
  return <div>Check your console (VS Code terminal or browser)</div>
}
