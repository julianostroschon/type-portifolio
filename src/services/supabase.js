import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabaseConfigured = Boolean(url && key)
// Only a public publishable key belongs in browser configuration.
export const supabase = supabaseConfigured ? createClient(url, key) : null
export function requireSupabase() {
  if (!supabase) throw new Error('A autenticação ainda não foi configurada.')
  return supabase
}
