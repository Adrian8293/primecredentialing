/**
 * hooks/useAuth.js
 *
 * FIX: All supabase calls are inside useEffect, which only runs in the browser.
 * Added explicit typeof window guards to prevent any accidental SSR execution.
 * The supabase Proxy already guards at the property-access level, but belt-and-
 * suspenders here ensures useAuth is safe even if called during SSR prerender.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // useEffect only runs in the browser — supabase calls are safe here.
    // The typeof window check is belt-and-suspenders for SSR safety.
    if (typeof window === 'undefined') return

    // Read session from local JWT first (instant, no network call).
    // Prevents the flash-redirect to /login on page load.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setAuthLoading(false)
      } else {
        // No local session — confirm with server
        supabase.auth.getUser().then(({ data: { user } }) => {
          setUser(user ?? null)
          setAuthLoading(false)
        }).catch(() => {
          setUser(null)
          setAuthLoading(false)
        })
      }
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session !== undefined) setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    if (typeof window === 'undefined') return
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/login'
  }

  return { user, authLoading, signOut }
}

export { useAuth }
