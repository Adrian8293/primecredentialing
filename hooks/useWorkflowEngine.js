import { useState, useCallback } from 'react'
import { addAudit } from '../lib/db'

/**
 * Provider Workflow Status Lifecycle States
 */
export const WORKFLOW_STATES = {
  NEW: 'New',
  INTAKE_PENDING: 'Intake Pending',
  DOCUMENTS_COLLECTING: 'Documents Collecting',
  CAQH_ACTIVE: 'CAQH Active',
  CREDENTIALING_IN_PROGRESS: 'Credentialing In Progress',
  PAYER_ENROLLMENT: 'Payer Enrollment',
  ACTIVE: 'Active',
  MONITORING: 'Monitoring',
  REJECTED_WITHDRAWN: 'Rejected/Withdrawn',
}

/**
 * Valid transitions map defining the strict state machine rules
 */
const VALID_TRANSITIONS = {
  [WORKFLOW_STATES.NEW]: [
    WORKFLOW_STATES.INTAKE_PENDING,
    WORKFLOW_STATES.REJECTED_WITHDRAWN
  ],
  [WORKFLOW_STATES.INTAKE_PENDING]: [
    WORKFLOW_STATES.DOCUMENTS_COLLECTING,
    WORKFLOW_STATES.REJECTED_WITHDRAWN
  ],
  [WORKFLOW_STATES.DOCUMENTS_COLLECTING]: [
    WORKFLOW_STATES.CAQH_ACTIVE,
    WORKFLOW_STATES.INTAKE_PENDING, // can jump back if forms are incomplete
    WORKFLOW_STATES.REJECTED_WITHDRAWN
  ],
  [WORKFLOW_STATES.CAQH_ACTIVE]: [
    WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS,
    WORKFLOW_STATES.DOCUMENTS_COLLECTING,
    WORKFLOW_STATES.REJECTED_WITHDRAWN
  ],
  [WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS]: [
    WORKFLOW_STATES.PAYER_ENROLLMENT,
    WORKFLOW_STATES.CAQH_ACTIVE,
    WORKFLOW_STATES.REJECTED_WITHDRAWN
  ],
  [WORKFLOW_STATES.PAYER_ENROLLMENT]: [
    WORKFLOW_STATES.ACTIVE,
    WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS,
    WORKFLOW_STATES.REJECTED_WITHDRAWN
  ],
  [WORKFLOW_STATES.ACTIVE]: [
    WORKFLOW_STATES.MONITORING,
    WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS // Re-credentialing due
  ],
  [WORKFLOW_STATES.MONITORING]: [
    WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS, // Needs re-credentialing
    WORKFLOW_STATES.ACTIVE
  ],
  [WORKFLOW_STATES.REJECTED_WITHDRAWN]: [
    WORKFLOW_STATES.NEW // Can reset/re-open a rejected provider
  ]
}

/**
 * Validates prerequisites before allowing a transition.
 * Returns { allowed: boolean, reason?: string }
 */
export function verifyTransitionPrerequisites(provider, targetState, enrollments = []) {
  switch (targetState) {
    case WORKFLOW_STATES.DOCUMENTS_COLLECTING:
      if (!provider.opcaData || Object.keys(provider.opcaData).length === 0) {
        return {
          allowed: false,
          reason: 'OPCA Form data has not been received or uploaded yet.'
        }
      }
      break
    case WORKFLOW_STATES.CAQH_ACTIVE:
      if (!provider.npi) {
        return {
          allowed: false,
          reason: 'NPI number is required to activate CAQH verification.'
        }
      }
      if (!provider.caqh) {
        return {
          allowed: false,
          reason: 'CAQH ID is missing.'
        }
      }
      break
    case WORKFLOW_STATES.PAYER_ENROLLMENT:
      if (!provider.license || !provider.licenseExp) {
        return {
          allowed: false,
          reason: 'Active State License is required for payer enrollment.'
        }
      }
      if (!provider.malCarrier || !provider.malExp) {
        return {
          allowed: false,
          reason: 'Malpractice insurance details are required.'
        }
      }
      break
    case WORKFLOW_STATES.ACTIVE:
      const activeEnrollments = enrollments.filter(e => e.provId === provider.id)
      if (activeEnrollments.length === 0) {
        return {
          allowed: false,
          reason: 'At least one payer enrollment must be initiated.'
        }
      }
      const pendingEnrollments = activeEnrollments.filter(e => !['Active', 'Denied'].includes(e.stage))
      if (pendingEnrollments.length > 0) {
        return {
          allowed: false,
          reason: `There are still ${pendingEnrollments.length} pending payer enrollments in progress.`
        }
      }
      break
    default:
      break
  }

  return { allowed: true }
}

/**
 * Custom React hook wrapper for the Workflow Engine
 */
export function useWorkflowEngine(provider, updateProvider, enrollments = []) {
  const currentStatus = provider?.status || WORKFLOW_STATES.NEW
  const [transitionError, setTransitionError] = useState(null)

  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []

  const canTransitionTo = useCallback((targetStatus) => {
    if (!allowedTransitions.includes(targetStatus)) {
      return {
        allowed: false,
        reason: `Direct transition from "${currentStatus}" to "${targetStatus}" is not permitted.`
      }
    }
    return verifyTransitionPrerequisites(provider, targetStatus, enrollments)
  }, [currentStatus, allowedTransitions, provider, enrollments])

  const transitionTo = useCallback(async (targetStatus) => {
    setTransitionError(null)
    const check = canTransitionTo(targetStatus)
    if (!check.allowed) {
      setTransitionError(check.reason)
      throw new Error(check.reason)
    }

    try {
      const updatedProvider = { ...provider, status: targetStatus }
      await updateProvider(updatedProvider)
      await addAudit(
        'Workflow',
        'Status Changed',
        `Changed status from "${currentStatus}" to "${targetStatus}"`,
        provider.id
      )
    } catch (err) {
      setTransitionError(err.message || 'Failed to update provider status.')
      throw err
    }
  }, [canTransitionTo, provider, currentStatus, updateProvider])

  const getNextRecommendedAction = useCallback(() => {
    switch (currentStatus) {
      case WORKFLOW_STATES.NEW:
        return {
          action: 'Send Intake Forms',
          description: 'Initiate OPCA profile requests and gather base provider data.',
          targetState: WORKFLOW_STATES.INTAKE_PENDING
        }
      case WORKFLOW_STATES.INTAKE_PENDING:
        return {
          action: 'Upload OPCA Profile',
          description: 'Receive and input the completed OPCA application form.',
          targetState: WORKFLOW_STATES.DOCUMENTS_COLLECTING
        }
      case WORKFLOW_STATES.DOCUMENTS_COLLECTING:
        return {
          action: 'Attest CAQH Profile',
          description: 'Verify license details and input NPI and CAQH ID fields.',
          targetState: WORKFLOW_STATES.CAQH_ACTIVE
        }
      case WORKFLOW_STATES.CAQH_ACTIVE:
        return {
          action: 'Start Credentialing Review',
          description: 'Initiate internal credentials verification checklist.',
          targetState: WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS
        }
      case WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS:
        return {
          action: 'Approve Payer Enrollment',
          description: 'Transition provider to Payer Enrollment stage to begin payer submissions.',
          targetState: WORKFLOW_STATES.PAYER_ENROLLMENT
        }
      case WORKFLOW_STATES.PAYER_ENROLLMENT:
        return {
          action: 'Monitor Payer Panels',
          description: 'Process submitted applications and follow up on pending contracts.',
          targetState: WORKFLOW_STATES.ACTIVE
        }
      case WORKFLOW_STATES.ACTIVE:
        return {
          action: 'Enter Routine Monitoring',
          description: 'Transition to monitoring mode for credentials and panel statuses.',
          targetState: WORKFLOW_STATES.MONITORING
        }
      case WORKFLOW_STATES.MONITORING:
        return {
          action: 'Perform Re-credentialing Checks',
          description: 'Track upcoming CAQH attestation deadlines and license expirations.',
          targetState: WORKFLOW_STATES.CREDENTIALING_IN_PROGRESS
        }
      default:
        return null
    }
  }, [currentStatus])

  return {
    status: currentStatus,
    allowedTransitions,
    canTransitionTo,
    transitionTo,
    transitionError,
    nextAction: getNextRecommendedAction()
  }
}
