import React from 'react'
import Head from 'next/head'
import { useGlobalContext } from '../context/AppContext'
import { WorkflowTasks } from '../components/WorkflowOverhaul'

export default function Tasks() {
  const { db, openTaskModal, tasks } = useGlobalContext()

  return (
    <>
      <Head>
        <title>Lacentra — Tasks</title>
      </Head>
      <WorkflowTasks
        db={db}
        openTaskModal={openTaskModal}
        handleMarkDone={tasks.handleMarkDone}
        handleDeleteTask={tasks.handleDeleteTask}
      />
    </>
  )
}

// Static page — no getServerSideProps needed.
// Auth is enforced client-side: Layout.jsx redirects unauthenticated
// users to /login via useAuth. Removing getServerSideProps eliminates
// the server round-trip that was causing tab-switch delays (every navigation
// previously waited for a /_next/data fetch before rendering).
