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
