import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { PayerHub } from '../features/payers/PayerHub.jsx'

export default function Payers() {
  const {
    db, openEnrollModal, openPayerModal, openAiFollowup,
    enrSearch, setEnrSearch,
    enrFStage, setEnrFStage,
    enrFProv, setEnrFProv,
    paySearch, setPaySearch,
    payFType, setPayFType,
    enrollments, payers
  } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Payers</title>
      </Head>
      <PayerHub
        db={db}
        initialTab="directory"
        openEnrollModal={openEnrollModal}
        openPayerModal={openPayerModal}
        search={enrSearch}
        setSearch={setEnrSearch}
        fStage={enrFStage}
        setFStage={setEnrFStage}
        fProv={enrFProv}
        setFProv={setEnrFProv}
        handleDeleteEnrollment={enrollments.handleDeleteEnrollment}
        paySearch={paySearch}
        setPaySearch={setPaySearch}
        payFType={payFType}
        setPayFType={setPayFType}
        handleDeletePayer={payers.handleDeletePayer}
        onDraftEmail={openAiFollowup}
      />
    </>
  )
}
