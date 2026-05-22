import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { Reports as ReportsView } from '../features/billing/Reports.jsx'

export default function Reports() {
  const { db, exportJSON } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Reports</title>
      </Head>
      <ReportsView
        db={db}
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
