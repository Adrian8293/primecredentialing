import { createBrowserClient } from '@supabase/ssr'

/**
 * lib/supabase.js — Browser-side Supabase client
 *
 * FIX: Removed the module-level throw for missing env vars.
 * The previous `throw new Error(...)` at module scope caused Turbopack's SSR
 * bundler to crash with "Cannot access 'aI' before initialization" during
 * static page prerendering — because the throw interrupted module evaluation
 * before all exports were registered, creating a Temporal Dead Zone on `supabase`.
 *
 * The guard is now deferred: the client is only created when env vars are present.
 * During SSR prerender of pages like /auth/callback, the supabase object is a
 * no-op placeholder — actual auth calls only happen client-side (inside useEffect),
 * so this is safe.
 */

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Warn in dev rather than crashing the build worker
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    // Only warn in the browser — during SSR prerender this is expected to be empty
    console.error('[supabase.js] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local file.')
  }
}

// createBrowserClient handles empty strings gracefully (returns a client that
// will surface auth errors at call time, not at module initialization time)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
