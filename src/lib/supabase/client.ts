import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY')
    }
    _adminClient = createClient(url, key)
  }
  return _adminClient
}

// Lazy proxy -- defers client creation to first use (runtime), not import time (build)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
