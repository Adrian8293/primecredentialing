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
