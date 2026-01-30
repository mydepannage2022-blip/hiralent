import { Request, Response } from 'express';
import {
  createInterview,
  assignInterview,
  startInterview,
  submitResponse,
  endInterview,
  getInterviewForCandidate,
  getInterviewDetails,
  getCandidateInterviews,
  getRecruiterInterviews,
} from '../../services/interview/aiInterview.service';

/**
 * Create a new AI interview session
 * POST /api/v1/interviews
 */
export const createInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { applicationId, jobId, interviewType } = req.body;

    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'applicationId is required' });
    }

    const result = await createInterview({
      candidateId,
      applicationId,
      jobId,
      interviewType: interviewType || 'screening',
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Create interview error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Start an interview session (generates questions and returns first question)
 * POST /api/v1/interviews/:interviewId/start
 */
export const startInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await startInterview({
      interviewId,
      candidateId,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Start interview error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message?.includes('cannot be started')) {
      return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Submit a response to a question
 * POST /api/v1/interviews/:interviewId/respond
 */
export const submitResponseController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    const { questionId, responseText, responseDuration } = req.body;

    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }
    if (!questionId) {
      return res.status(400).json({ success: false, error: 'questionId is required' });
    }
    if (!responseText) {
      return res.status(400).json({ success: false, error: 'responseText is required' });
    }

    const result = await submitResponse({
      interviewId,
      candidateId,
      questionId,
      responseText,
      responseDuration: responseDuration || 0,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Submit response error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message === 'Question not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message?.includes('Cannot submit response')) {
      return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * End the interview and get final evaluation
 * POST /api/v1/interviews/:interviewId/end
 */
export const endInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await endInterview({
      interviewId,
      candidateId,
    });

    // Return limited info to candidate (no detailed scores)
    return res.json({
      success: true,
      data: {
        interviewId: result.interviewId,
        status: result.status,
        duration: result.duration,
        completedAt: result.completedAt,
        // Note: qualification and scores are NOT exposed to candidates
      },
    });
  } catch (err: any) {
    console.error('End interview error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message?.includes('Cannot end interview')) {
      return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Get interview status (for candidates - limited info)
 * GET /api/v1/interviews/:interviewId
 */
export const getInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await getInterviewForCandidate(interviewId, candidateId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get interview error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Get full interview details (for admins/recruiters only)
 * GET /api/v1/interviews/:interviewId/details
 */
export const getInterviewDetailsController = async (req: Request, res: Response) => {
  try {
    // Check if user is admin or recruiter
    const userRole = req.user?.role;
    if (!userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin/recruiter role required.' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await getInterviewDetails(interviewId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get interview details error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// ==================== Recruiter Routes ====================

/**
 * Assign an interview to a candidate (recruiter only)
 * POST /api/v1/interviews/assign
 */
export const assignInterviewController = async (req: Request, res: Response) => {
  try {
    const recruiterId = req.user?.user_id;
    const userRole = req.user?.role;

    // Only recruiters/admins can assign interviews
    if (!recruiterId || !userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Recruiter role required.' });
    }

    const { candidateId, applicationId, jobId, interviewType, scheduledDate } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required' });
    }
    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'applicationId is required' });
    }
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ success: false, error: 'scheduledDate is required' });
    }

    const result = await assignInterview({
      recruiterId,
      candidateId,
      applicationId,
      jobId,
      interviewType: interviewType || 'screening',
      scheduledDate: new Date(scheduledDate),
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Assign interview error:', err);

    if (err.message === 'Application not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message?.includes('does not match') || err.message?.includes('does not belong')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.message === 'Interview already assigned for this application') {
      return res.status(409).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Get all interviews for the company (recruiter view)
 * GET /api/v1/interviews/company
 */
export const getCompanyInterviewsController = async (req: Request, res: Response) => {
  try {
    const recruiterId = req.user?.user_id;
    const userRole = req.user?.role;

    if (!recruiterId || !userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Recruiter role required.' });
    }

    // For company_admin, also filter by company
    // For superadmin, show all
    const companyId = userRole === 'company_admin' ? recruiterId : undefined;

    const result = await getRecruiterInterviews(recruiterId, companyId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get company interviews error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// ==================== Candidate Routes ====================

/**
 * Get all interviews for the candidate (their assigned interviews)
 * GET /api/v1/interviews/my
 */
export const getMyInterviewsController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await getCandidateInterviews(candidateId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get my interviews error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};
