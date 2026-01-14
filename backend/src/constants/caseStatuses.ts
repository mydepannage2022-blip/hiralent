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

// Helper functions
export const isActiveVisaCase = (
  caseStatus: string, 
  embassyStatus?: string
): boolean => {
  // Rejected or cancelled = not active
  if (embassyStatus === EMBASSY_STATUSES.REJECTED) return false;
  if (caseStatus === CASE_STATUSES.CANCELLED) return false;
  
  // Completed = not active
  if (caseStatus === CASE_STATUSES.COMPLETED) return false;
  if (caseStatus === CASE_STATUSES.READY_FOR_ARRIVAL) return false;
  
  // Approved and moved to housing = not active for VISA
  if (embassyStatus === EMBASSY_STATUSES.APPROVED && 
      (caseStatus === CASE_STATUSES.HOUSING_ASSIGNED || 
       caseStatus === CASE_STATUSES.HOUSING_IN_PROGRESS)) {
    return false;
  }
  
  return true;
};

export const isActiveRelocationCase = (caseStatus: string): boolean => {
  return caseStatus === CASE_STATUSES.HOUSING_ASSIGNED ||
         caseStatus === CASE_STATUSES.HOUSING_IN_PROGRESS;
};

export const isCompletedVisaCase = (
  caseStatus: string,
  embassyStatus?: string
): boolean => {
  return embassyStatus === EMBASSY_STATUSES.APPROVED ||
         caseStatus === CASE_STATUSES.COMPLETED ||
         caseStatus === CASE_STATUSES.READY_FOR_ARRIVAL;
};

export const isCompletedRelocationCase = (caseStatus: string): boolean => {
  return caseStatus === CASE_STATUSES.READY_FOR_ARRIVAL ||
         caseStatus === CASE_STATUSES.COMPLETED;
};