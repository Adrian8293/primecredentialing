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

// Force dynamic server rendering — this page uses auth/context and must never
// be statically prerendered by Next.js build.
export async function getServerSideProps() {
  return { props: {} }
}
