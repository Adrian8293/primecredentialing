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

// Force dynamic server rendering — this page uses auth/context and must never
// be statically prerendered by Next.js build.
export async function getServerSideProps() {
  return { props: {} }
}
