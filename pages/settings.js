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

// Force dynamic server rendering — this page uses auth/context and must never
// be statically prerendered by Next.js build.
export async function getServerSideProps() {
  return { props: {} }
}
