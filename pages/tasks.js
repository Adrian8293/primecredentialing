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

// Force dynamic server rendering — this page uses auth/context and must never
// be statically prerendered by Next.js build.
export async function getServerSideProps() {
  return { props: {} }
}
