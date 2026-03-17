/**
 * CASE STATUS REFERENCE
 * Complete list of all possible case statuses
 */

export const CASE_STATUSES = {
  // Initial phase
  INITIATED: 'initiated',
  PENDING_DOCUMENTS: 'pending_documents',
  IN_PROGRESS: 'in_progress',
  
  // Embassy submission phase
  SUBMITTED: 'submitted',              // Maps to embassy_submission.status
  UNDER_REVIEW: 'under_review',        // Maps to embassy_submission.status
  INTERVIEW_SCHEDULED: 'interview_scheduled',  // Maps to embassy_submission.status
  
  // Housing phase
  HOUSING_ASSIGNED: 'housing_assigned',
  HOUSING_IN_PROGRESS: 'housing_in_progress',
  READY_FOR_ARRIVAL: 'ready_for_arrival',
  
  // Integration phase 
  INTEGRATION_ASSIGNED: 'integration_assigned',
  INTEGRATION_IN_PROGRESS: 'integration_in_progress',

  // Final states
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const EMBASSY_STATUSES = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Integration service statuses
export const INTEGRATION_SERVICE_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Integration service types
export const INTEGRATION_SERVICE_TYPES = {
  HEALTHCARE: 'healthcare',
  BANKING: 'banking',
  TAX_ID: 'tax_id',
  TELECOM: 'telecom',
  TRANSPORT: 'transport',
  INTEGRATION_PROGRAM: 'integration_program',
} as const;

// Helper functions
export const isActiveVisaCase = (
  caseStatus: string, 
  embassyStatus?: string,
  housingAgencyAssigned?: boolean
): boolean => {
  // Rejected or cancelled = not active
  if (embassyStatus === EMBASSY_STATUSES.REJECTED) return false;
  if (caseStatus === CASE_STATUSES.CANCELLED) return false;

  // Visa approved = visa work is finished
  if (embassyStatus === EMBASSY_STATUSES.APPROVED) return false;
  
  // Completed = not active
  if (caseStatus === CASE_STATUSES.COMPLETED) return false;
  
  // If embassy approved AND housing assigned, visa work is done
  // (kept for backward compatibility; handled above)
  if (embassyStatus === EMBASSY_STATUSES.APPROVED && housingAgencyAssigned) return false;
  
  // If case moved to housing/integration phases, visa work is done
  if (caseStatus === CASE_STATUSES.HOUSING_ASSIGNED ||
      caseStatus === CASE_STATUSES.HOUSING_IN_PROGRESS ||
      caseStatus === CASE_STATUSES.READY_FOR_ARRIVAL ||
      caseStatus === CASE_STATUSES.INTEGRATION_ASSIGNED ||
      caseStatus === CASE_STATUSES.INTEGRATION_IN_PROGRESS) {
    return false;
  }
  
  return true;
};

export const isActiveRelocationCase = (caseStatus: string): boolean => {
  return caseStatus === CASE_STATUSES.HOUSING_ASSIGNED ||
         caseStatus === CASE_STATUSES.HOUSING_IN_PROGRESS;
};

/**
 * Check if a case is active for integration agency
 * A case is active if it has incomplete integration services
 */
export const isActiveIntegrationCase = (
  integrationServices: Array<{ status: string }>
): boolean => {
  // Active if any service is not completed
  return integrationServices.some(
    service => service.status !== INTEGRATION_SERVICE_STATUSES.COMPLETED &&
               service.status !== INTEGRATION_SERVICE_STATUSES.CANCELLED
  );
};

/**
 * Check if integration work is completed
 * Completed when all 6 services are done
 */
export const isCompletedIntegrationCase = (
  integrationServices: Array<{ status: string }>
): boolean => {
  // Need all 6 services
  if (integrationServices.length < 6) return false;
  
  // All must be completed
  return integrationServices.every(
    service => service.status === INTEGRATION_SERVICE_STATUSES.COMPLETED
  );
};

/**
 * Get count of pending integration services
 */
export const getPendingIntegrationServicesCount = (
  integrationServices: Array<{ status: string }>
): number => {
  return integrationServices.filter(
    service => service.status === INTEGRATION_SERVICE_STATUSES.PENDING
  ).length;
};

/**
 * Get count of completed integration services
 */
export const getCompletedIntegrationServicesCount = (
  integrationServices: Array<{ status: string }>
): number => {
  return integrationServices.filter(
    service => service.status === INTEGRATION_SERVICE_STATUSES.COMPLETED
  ).length;
};

/**
 * Get count of in-progress integration services
 */
export const getInProgressIntegrationServicesCount = (
  integrationServices: Array<{ status: string }>
): number => {
  return integrationServices.filter(
    service => service.status === INTEGRATION_SERVICE_STATUSES.IN_PROGRESS
  ).length;
};

export const isCompletedVisaCase = (
  caseStatus: string,
  embassyStatus?: string,
  housingAgencyAssigned?: boolean
): boolean => {
  if (embassyStatus === EMBASSY_STATUSES.APPROVED && housingAgencyAssigned) {
    return true;
  }
  if (embassyStatus === EMBASSY_STATUSES.APPROVED || 
      caseStatus === CASE_STATUSES.HOUSING_ASSIGNED ||
      caseStatus === CASE_STATUSES.HOUSING_IN_PROGRESS ||
      caseStatus === CASE_STATUSES.READY_FOR_ARRIVAL ||
      caseStatus === CASE_STATUSES.INTEGRATION_ASSIGNED ||
      caseStatus === CASE_STATUSES.INTEGRATION_IN_PROGRESS ||
      caseStatus === CASE_STATUSES.COMPLETED) {
    return true;
  }
  return false;
};

export const isCompletedRelocationCase = (caseStatus: string): boolean => {
  return caseStatus === CASE_STATUSES.READY_FOR_ARRIVAL ||
         caseStatus === CASE_STATUSES.COMPLETED;
};