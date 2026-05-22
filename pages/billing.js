import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { BillingHub } from '../features/billing/BillingHub.jsx'

export default function Billing() {
  const { db, toast, requestConfirm, openAiFollowup } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Billing</title>
      </Head>
      <BillingHub
        db={db}
        toast={toast}
        requestConfirm={requestConfirm}
        onDraftAppeal={openAiFollowup}
      />
    </>
  )
}

// Static page — no getServerSideProps needed.
// Auth is enforced client-side: Layout.jsx redirects unauthenticated
// users to /login via useAuth. Removing getServerSideProps eliminates
// the server round-trip that was causing tab-switch delays (every navigation
// previously waited for a /_next/data fetch before rendering).
