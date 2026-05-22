import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { Dashboard } from '../features/billing/Dashboard.jsx'

export default function IndexPage() {
  const { db, setPage, openEnrollModal, openAiFollowup, openPayerModal } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Dashboard</title>
      </Head>
      <Dashboard
        db={db}
        setPage={setPage}
        openEnrollModal={openEnrollModal}
        onDraftEmail={openAiFollowup}
        openPayerModal={openPayerModal}
      />
    </>
  )
}

// Force dynamic server rendering — this page uses auth/context and must never
// be statically prerendered by Next.js build.
export async function getServerSideProps() {
  return { props: {} }
}
