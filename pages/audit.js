import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { Audit as AuditView } from '../features/billing/Audit.jsx'

export default function Audit() {
  const {
    db, auditSearch, setAuditSearch,
    auditFType, setAuditFType, handleClearAudit
  } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Audit Log</title>
      </Head>
      <AuditView
        db={db}
        search={auditSearch}
        setSearch={setAuditSearch}
        fType={auditFType}
        setFType={setAuditFType}
        handleClearAudit={handleClearAudit}
      />
    </>
  )
}

// Static page — no getServerSideProps needed.
// Auth is enforced client-side: Layout.jsx redirects unauthenticated
// users to /login via useAuth. Removing getServerSideProps eliminates
// the server round-trip that was causing tab-switch delays (every navigation
// previously waited for a /_next/data fetch before rendering).
