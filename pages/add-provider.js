import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { AddProviderWizard } from '../features/providers/AddProviderWizard.jsx'

export default function AddProvider() {
  const { db, setPage, providers } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Add Provider</title>
      </Head>
      <AddProviderWizard
        db={db}
        provForm={providers.provForm}
        setProvForm={providers.setProvForm}
        editingId={{ provider: providers.editingProviderId }}
        setEditingId={({ provider }) => providers.setEditingProviderId(provider)}
        npiInput={providers.npiInput}
        setNpiInput={providers.setNpiInput}
        npiResult={providers.npiResult}
        setNpiResult={providers.setNpiResult}
        npiLoading={providers.npiLoading}
        lookupNPI={providers.lookupNPI}
        handleSaveProvider={providers.handleSaveProvider}
        handleDeleteProvider={providers.handleDeleteProvider}
        handlePhotoUpload={providers.handlePhotoUpload}
        handleDeletePhoto={providers.handleDeletePhoto}
        photoUploading={providers.photoUploading}
        setPage={setPage}
        saving={providers.saving}
      />
    </>
  )
}
