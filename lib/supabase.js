import { createBrowserClient } from '@supabase/ssr'

/**
 * lib/supabase.js — Browser-side Supabase client
 *
 * TURBOPACK TDZ FIX:
 * The previous version called createBrowserClient() at module evaluation time.
 * Turbopack's SSR bundle evaluates all imported modules during `next build`
 * static prerendering, even for browser-only pages. If createBrowserClient()
 * or the env-var guard threw/errored mid-module, the `supabase` const was
 * registered in the module namespace but never initialized — creating a
 * Temporal Dead Zone. Any other module in the same SSR chunk that referenced
 * `supabase` would then crash with "Cannot access 'X' before initialization".
 *
 * FIX: Lazy initialization via a getter function. createBrowserClient is
 * called on first use (always in the browser, inside useEffect/event handlers),
 * never at module load time. SSR prerender gets a no-op proxy that satisfies
 * import resolution without executing any Supabase code.
 */

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL      || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Lazily initialized — created on first access, never at module eval time
let _supabase = null

function _createClient() {
  if (_supabase) return _supabase
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[supabase.js] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
      'Check your .env.local and Vercel environment variables.'
    )
  }
  _supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}

/**
 * Proxy-based lazy client.
 * - During SSR prerender: property accesses return undefined (no Supabase code runs)
 * - In browser: first property access triggers createBrowserClient(), then delegates
 *
 * All existing code using `supabase.auth.*` and `supabase.from(...)` works unchanged.
 */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      // During SSR (no window), return a no-op to satisfy module resolution.
      // Pages that actually use supabase must use it inside useEffect (browser-only).
      if (typeof window === 'undefined') return undefined
      return _createClient()[prop]
    },
    set(_target, prop, value) {
      if (typeof window !== 'undefined') _createClient()[prop] = value
      return true
    },
  }
)
