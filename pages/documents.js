import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { DocumentsPage } from '../features/documents/DocumentsPage.jsx'

export default function Documents() {
  const {
    db, openDocModal,
    docSearch, setDocSearch,
    docFType, setDocFType,
    docFStatus, setDocFStatus,
    documents
  } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Documents</title>
      </Head>
      <DocumentsPage
        db={db}
        docSearch={docSearch}
        setDocSearch={setDocSearch}
        docFType={docFType}
        setDocFType={setDocFType}
        docFStatus={docFStatus}
        setDocFStatus={setDocFStatus}
        openDocModal={openDocModal}
        handleDeleteDocument={documents.handleDeleteDocument}
      />
    </>
  )
}
