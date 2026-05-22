import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { MarketingPage } from '../features/marketing/MarketingPage.jsx'

export default function Marketing() {
  const { db, setPage, providers } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Marketing</title>
      </Head>
      <MarketingPage
        db={db}
        setPage={setPage}
        editProvider={providers.editProvider}
      />
    </>
  )
}

// Static page — no getServerSideProps needed.
// Auth is enforced client-side: Layout.jsx redirects unauthenticated
// users to /login via useAuth. Removing getServerSideProps eliminates
// the server round-trip that was causing tab-switch delays (every navigation
// previously waited for a /_next/data fetch before rendering).
