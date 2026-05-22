import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loadAll, subscribeToAll, mergeRealtimeChange } from '../lib/db'

/**
 * useAppData.js — LACentra
 *
 * FIX LOG:
 *   BUG-6: Added a 10-second failsafe timeout to loadAll().
 *          Previously, if any of the 11 parallel Supabase queries was slow or
 *          failed silently, the global spinner showed indefinitely.
 *          Now: the UI unblocks after 10s with a warning toast, so staff
 *          can at least navigate even on degraded connections.
 *
 *   A-03 (existing): orgId resolved from organization_members, not user.id.
 *   D-03 (existing): subscribeToAll receives orgId for proper channel filtering.
 */
export function useAppData(user, toast) {
  const [db, setDb] = useState({
    providers: [], payers: [], enrollments: [], documents: [],
    tasks: [], auditLog: [], settings: {},
    eligibilityChecks: [], claims: [], denials: [], payments: [],
    providersMeta: { truncated: false, total: 0 },
  })
  const [loading, setLoading]           = useState(true)
  const [settingsForm, setSettingsForm] = useState({})
  const [orgId, setOrgId]               = useState(null)

  // Resolve the org UUID from organization_members (not user.id)
  useEffect(() => {
    if (!user) return
    supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[useAppData] Could not resolve orgId:', error.message)
          return
        }
        if (data?.org_id) setOrgId(data.org_id)
      })
  }, [user])

  // Initial data load with 10-second failsafe timeout
  useEffect(() => {
    if (!user) return
    setLoading(true)

    // BUG-6 FIX: If loadAll() takes > 10s, unblock the UI with a warning.
    // This covers: slow Supabase cold-starts, transient network issues,
    // or a single query hanging and blocking all 11.
    const timeout = setTimeout(() => {
      console.warn('[useAppData] loadAll() exceeded 10s — unblocking UI')
      toast(
        'Data is taking longer than usual to load. Some information may be incomplete — try refreshing.',
        'warn'
      )
      setLoading(false)
    }, 10_000)

    loadAll()
      .then(data => {
        clearTimeout(timeout)
        setDb(data)
        setSettingsForm(data.settings)
        setLoading(false)
      })
      .catch(err => {
        clearTimeout(timeout)
        toast('Error loading data: ' + err.message, 'error')
        setLoading(false)
      })

    return () => clearTimeout(timeout)
  }, [user])

  // Realtime subscription — org-scoped once orgId resolves
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToAll(
      (stateKey, mappedRow, eventType, oldId) => {
        setDb(prev => mergeRealtimeChange(prev, stateKey, mappedRow, eventType, oldId))
      },
      orgId   // null until resolved — subscribeToAll handles null gracefully
    )
    return unsub
  }, [user, orgId])

  return { db, setDb, loading, settingsForm, setSettingsForm }
}
