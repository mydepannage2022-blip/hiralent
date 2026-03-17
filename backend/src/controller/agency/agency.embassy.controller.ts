import { Request, Response } from "express";
import {
  getAgencyIdForUser,
  getCaseForEmbassySubmission,
  getExistingEmbassySubmission,
  createEmbassySubmission,
  updateCaseStatus,
  getCaseWithEmbassySubmission,
  updateEmbassySubmission,
  mapEmbassyStatusToCaseStatus,
  scheduleEmbassyInterview,
  getCaseEmbassySubmission,
  sendSubmissionConfirmationEmail,
  sendVisaApprovedEmail,
  sendEmbassyStatusUpdateEmail,
  sendInterviewScheduledEmail,
} from "../../services/agency/agency.embassy.service";

// ==================== SUBMIT CASE TO EMBASSY ====================
export const submitToEmbassy = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.id as string;
    const {
      embassy_name,
      embassy_location,
      submission_date,
      tracking_number,
      expected_response,
      receipt_url,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const agencyId = await getAgencyIdForUser(userId);
    if (!agencyId) {
      return res.status(403).json({ success: false, message: "User is not associated with an agency" });
    }

    const caseData = await getCaseForEmbassySubmission(caseId, agencyId);
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const allApproved = caseData.documents.every((doc) => doc.status === "approved");
    if (!allApproved) {
      return res.status(400).json({ success: false, message: "All documents must be approved before embassy submission" });
    }

    const existingSubmission = await getExistingEmbassySubmission(caseId);
    if (existingSubmission) {
      return res.status(400).json({ success: false, message: "Case already submitted to embassy" });
    }

    const submission = await createEmbassySubmission(caseId, {
      embassy_name,
      embassy_location,
      submission_date,
      tracking_number,
      expected_response,
      receipt_url,
    });

    await updateCaseStatus(caseId, "submitted_to_embassy");

    try {
      await sendSubmissionConfirmationEmail({
        candidateEmail: caseData.candidate.email,
        candidateName: caseData.candidate.full_name || "Candidate",
        caseNumber: caseData.case_number,
        caseId,
        embassy_name,
        embassy_location,
        submission_date,
        tracking_number,
        expected_response,
      });
    } catch (emailError) {
      console.error("Email error:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Case submitted to embassy successfully",
      data: submission,
    });
  } catch (error) {
    console.error("Submit to embassy error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit to embassy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ==================== UPDATE EMBASSY STATUS ====================
export const updateEmbassyStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.id as string;
    const { status, decision_date, decision_notes } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const agencyId = await getAgencyIdForUser(userId);
    if (!agencyId) {
      return res.status(403).json({ success: false, message: "User is not associated with an agency" });
    }

    const caseData = await getCaseWithEmbassySubmission(caseId, agencyId);
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    if (!caseData.embassy_submission) {
      return res.status(400).json({ success: false, message: "Case not submitted to embassy yet" });
    }

    const validStatuses = ["submitted", "under_review", "interview_scheduled", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updatedSubmission = await updateEmbassySubmission(caseId, {
      status,
      decision_date,
      decision_notes,
    });

    const newCaseStatus = mapEmbassyStatusToCaseStatus(status, caseData.status);
    await updateCaseStatus(caseId, newCaseStatus);

    try {
      if (status === "approved") {
        await sendVisaApprovedEmail({
          candidateEmail: caseData.candidate.email,
          candidateName: caseData.candidate.full_name || "Candidate",
          caseNumber: caseData.case_number,
          caseId,
          destinationCountry: caseData.destination_country,
          embassyName: caseData.embassy_submission.embassy_name,
          decisionNotes: decision_notes,
        });
      } else {
        await sendEmbassyStatusUpdateEmail({
          candidateEmail: caseData.candidate.email,
          candidateName: caseData.candidate.full_name || "Candidate",
          caseNumber: caseData.case_number,
          caseId,
          embassyName: caseData.embassy_submission.embassy_name,
          status,
          decisionNotes: decision_notes,
        });
      }
    } catch (emailError) {
      console.error("Email error:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Embassy status updated successfully",
      data: updatedSubmission,
    });
  } catch (error) {
    console.error("Update embassy status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update embassy status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ==================== SCHEDULE INTERVIEW ====================
export const scheduleInterview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.id as string;
    const { interview_date, interview_location, interview_notes } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const agencyId = await getAgencyIdForUser(userId);
    if (!agencyId) {
      return res.status(403).json({ success: false, message: "User is not associated with an agency" });
    }

    const caseData = await getCaseWithEmbassySubmission(caseId, agencyId);
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    if (!caseData.embassy_submission) {
      return res.status(400).json({ success: false, message: "Case not submitted to embassy yet" });
    }

    const updatedSubmission = await scheduleEmbassyInterview(caseId, {
      interview_date,
      interview_location,
      interview_notes,
    });

    await updateCaseStatus(caseId, "interview_scheduled");

    try {
      await sendInterviewScheduledEmail({
        candidateEmail: caseData.candidate.email,
        candidateName: caseData.candidate.full_name || "Candidate",
        caseNumber: caseData.case_number,
        caseId,
        embassyName: caseData.embassy_submission.embassy_name,
        interview_date,
        interview_location,
        interview_notes,
      });
    } catch (emailError) {
      console.error("Email error:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Interview scheduled successfully",
      data: updatedSubmission,
    });
  } catch (error) {
    console.error("Schedule interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to schedule interview",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ==================== GET EMBASSY SUBMISSION ====================
export const getEmbassySubmission = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const agencyId = await getAgencyIdForUser(userId);
    if (!agencyId) {
      return res.status(403).json({ success: false, message: "User is not associated with an agency" });
    }

    const caseData = await getCaseEmbassySubmission(caseId, agencyId);
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    if (!caseData.embassy_submission) {
      return res.status(404).json({ success: false, message: "No embassy submission found for this case" });
    }

    return res.status(200).json({
      success: true,
      data: caseData.embassy_submission,
    });
  } catch (error) {
    console.error("Get embassy submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get embassy submission",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};