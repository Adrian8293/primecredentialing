import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { Settings as SettingsView } from '../features/billing/Settings.jsx'

export default function Settings() {
  const { settingsForm, setSettingsForm, handleSaveSettings, exportJSON } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Settings</title>
      </Head>
      <SettingsView
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        handleSaveSettings={handleSaveSettings}
        exportJSON={exportJSON}
      />
    </>
  )
}

// Static page — no getServerSideProps needed.
// Auth is enforced client-side: Layout.jsx redirects unauthenticated
// users to /login via useAuth. Removing getServerSideProps eliminates
// the server round-trip that was causing tab-switch delays (every navigation
// previously waited for a /_next/data fetch before rendering).
