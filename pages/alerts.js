import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { Alerts as AlertsView } from '../features/billing/Alerts.jsx'

export default function Alerts() {
  const { db, providers, openAiFollowup, setPage } = useGlobalContext()

  const handleOpenProvider = (id) => {
    providers.editProvider(id)
    setPage('providers')
  }

  return (
    <>
      <Head>
        <title>Lacentra — Alerts</title>
      </Head>
      <AlertsView
        db={db}
        onOpenProvider={handleOpenProvider}
        onDraftEmail={openAiFollowup}
        onMarkDone={providers.handleAlertMarkDone}
      />
    </>
  )
}

// Force dynamic server rendering — this page uses auth/context and must never
// be statically prerendered by Next.js build.
export async function getServerSideProps() {
  return { props: {} }
}
