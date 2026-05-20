import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { ApplicationsPage } from '../features/enrollments/ApplicationsPage.jsx'

export default function Enrollments() {
  const {
    db, openEnrollModal, openAiFollowup, loading,
    enrSearch, setEnrSearch,
    enrFStage, setEnrFStage,
    enrFProv, setEnrFProv,
    enrollments
  } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Enrollments</title>
      </Head>
      <ApplicationsPage
        db={db}
        openEnrollModal={openEnrollModal}
        search={enrSearch}
        setSearch={setEnrSearch}
        fStage={enrFStage}
        setFStage={setEnrFStage}
        fProv={enrFProv}
        setFProv={setEnrFProv}
        handleDeleteEnrollment={enrollments.handleDeleteEnrollment}
        onDraftEmail={openAiFollowup}
        handleStageChange={enrollments.handleStageChange}
        loading={loading}
      />
    </>
  )
}
