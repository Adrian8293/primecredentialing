import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useAppData } from '../hooks/useAppData'
import { useConfirm } from '../hooks/useConfirm'
import { useProviderActions } from '../hooks/useProviderActions'
import { useEnrollmentActions } from '../hooks/useEnrollmentActions'
import { usePayerActions } from '../hooks/usePayerActions'
import { useDocumentActions } from '../hooks/useDocumentActions'
import { useTaskActions } from '../hooks/useTaskActions'
import { saveSettings as saveSettingsDB, clearAuditLog as clearAuditLogDB } from '../lib/db'
import { providerAlertCount, daysUntil } from '../lib/helpers'

const AppContext = createContext(null)

export function AppContextProvider({ children }) {
  const router = useRouter()
  const { user, authLoading, signOut } = useAuth()
  const { toasts, toast } = useToast()
  const { db, setDb, loading, settingsForm, setSettingsForm } = useAppData(user, toast)
  const { confirmDialog, requestConfirm, settleConfirm } = useConfirm()

  // setPage maps string names to Next.js file routes
  const setPage = (p) => {
    if (p === 'dashboard') {
      router.push('/')
    } else {
      router.push(`/${p}`)
    }
  }

  const providers = useProviderActions({ db, setDb, toast, requestConfirm, setPage })
  const enrollments = useEnrollmentActions({ db, setDb, toast, requestConfirm })
  const payers = usePayerActions({ db, setDb, toast, requestConfirm })
  const documents = useDocumentActions({ db, setDb, toast, requestConfirm })
  const tasks = useTaskActions({ db, setDb, toast, requestConfirm })

  // Modal and state management (moved from index.js)
  const [modal, setModal] = useState(null)
  const [provDetailId, setProvDetailId] = useState(null)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiModalEnrollment, setAiModalEnrollment] = useState(null)

  // Page-specific search and filter states
  const [provSearch, setProvSearch] = useState('')
  const [provFStatus, setProvFStatus] = useState('')
  const [provFSpec, setProvFSpec] = useState('')

  const [enrSearch, setEnrSearch] = useState('')
  const [enrFStage, setEnrFStage] = useState('')
  const [enrFProv, setEnrFProv] = useState('')

  const [paySearch, setPaySearch] = useState('')
  const [payFType, setPayFType] = useState('')

  const [docSearch, setDocSearch] = useState('')
  const [docFType, setDocFType] = useState('')
  const [docFStatus, setDocFStatus] = useState('')

  const [auditSearch, setAuditSearch] = useState('')
  const [auditFType, setAuditFType] = useState('')

  const alertDays = db.settings.alertDays || 90
  const caqhDays = db.settings.caqhDays || 30
  const alertCount = db.providers.reduce((n, prov) => {
    return n + providerAlertCount(prov, { alertDays, caqhDays })
  }, 0)
  const expDocs = db.documents.filter(d => { const days = daysUntil(d.exp); return days !== null && days <= alertDays }).length
  const provDetail = provDetailId ? db.providers.find(x => x.id === provDetailId) : null

  function openProvDetail(id) { setProvDetailId(id); setModal('provDetail') }
  function openAiFollowup(enrollment) {
    setAiModalEnrollment(enrollment)
    setAiModalOpen(true)
  }

  function openEnrollModal(id, preProvId) { enrollments.openEnrollModal(id, preProvId); setModal('enroll') }
  function openPayerModal(id) { payers.openPayerModal(id); setModal('payer') }
  function openDocModal(id) { documents.openDocModal(id); setModal('doc') }
  function openTaskModal(id) { tasks.openTaskModal(id); setModal('task') }

  async function handleSaveEnrollment() { await enrollments.handleSaveEnrollment(); setModal(null) }
  async function handleSavePayer() { await payers.handleSavePayer(); setModal(null) }
  async function handleSaveDocument() { return await documents.handleSaveDocument() }
  async function handleSaveTask() { await tasks.handleSaveTask(); setModal(null) }

  async function handleSaveSettings() {
    try {
      await saveSettingsDB(settingsForm)
      setDb(prev => ({ ...prev, settings: settingsForm }))
      toast('Settings saved!', 'success')
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleClearAudit() {
    if (!(await requestConfirm({
      title: 'Archive Audit Log',
      body: 'Audit records are append-only for HIPAA compliance. This records an archive request in the audit trail. Records are not deleted — contact your administrator to export and purge old entries.',
      confirmText: 'Record archive request',
      danger: false,
    }))) return
    try {
      await clearAuditLogDB()
      toast('Archive request recorded. Contact your admin to export old entries.', 'success')
    } catch (err) { toast(err.message, 'error') }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lacentra-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    toast('Backup exported!', 'success')
  }

  return (
    <AppContext.Provider value={{
      user, authLoading, signOut,
      toasts, toast,
      db, setDb, loading, settingsForm, setSettingsForm,
      confirmDialog, requestConfirm, settleConfirm,
      providers, enrollments, payers, documents, tasks,
      modal, setModal,
      provDetailId, setProvDetailId,
      globalSearchOpen, setGlobalSearchOpen,
      aiModalOpen, setAiModalOpen,
      aiModalEnrollment, setAiModalEnrollment,
      provSearch, setProvSearch,
      provFStatus, setProvFStatus,
      provFSpec, setProvFSpec,
      enrSearch, setEnrSearch,
      enrFStage, setEnrFStage,
      enrFProv, setEnrFProv,
      paySearch, setPaySearch,
      payFType, setPayFType,
      docSearch, setDocSearch,
      docFType, setDocFType,
      docFStatus, setDocFStatus,
      auditSearch, setAuditSearch,
      auditFType, setAuditFType,
      alertDays, caqhDays, alertCount, expDocs, provDetail,
      openProvDetail, openAiFollowup,
      openEnrollModal, openPayerModal, openDocModal, openTaskModal,
      handleSaveEnrollment, handleSavePayer, handleSaveDocument, handleSaveTask,
      handleSaveSettings, handleClearAudit, exportJSON,
      setPage
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useGlobalContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useGlobalContext must be used within AppContextProvider')
  return context
}
