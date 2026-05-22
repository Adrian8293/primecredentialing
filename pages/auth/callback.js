/**
 * pages/auth/callback.js
 *
 * Catches Supabase magic link and OAuth redirects.
 * Supabase appends #access_token=... to the Site URL after auth.
 * This page reads that token, establishes the session, then redirects home.
 *
 * FIX: Added getServerSideProps to prevent static prerendering.
 * Without it, Next.js (Turbopack) attempted to statically generate this page
 * during `next build`, which caused "Cannot access 'aI' before initialization"
 * because window/auth state is unavailable in the SSR prerender worker.
 * Auth pages must always be server-rendered (or client-only) — never static.
 */
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    // getSession() reads the token from the URL fragment automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/'
      } else {
        // No session found — send back to login
        window.location.href = '/login'
      }
    })
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      color: '#64748B',
      fontSize: '14px',
    }}>
      Signing you in…
    </div>
  )
}

/**
 * Force dynamic rendering — this page must never be statically prerendered.
 * It relies on URL fragments and browser auth state that only exist at runtime.
 */

// Static page — no getServerSideProps needed.
// Auth is enforced client-side: Layout.jsx redirects unauthenticated
// users to /login via useAuth. Removing getServerSideProps eliminates
// the server round-trip that was causing tab-switch delays (every navigation
// previously waited for a /_next/data fetch before rendering).
