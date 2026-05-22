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

// Force dynamic server rendering — this page uses auth/context and must never
// be statically prerendered by Next.js build.
export async function getServerSideProps() {
  return { props: {} }
}
