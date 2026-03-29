import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import EmployerAssessmentService from '../../services/company/employerAssessment.service';
import { attachQuestionsToAssessment,getQuestionsForAssessment,updateAssessmentQuestionOverride,attachQuestionsByIdsToAssessment,detachQuestionFromAssessment,reorderAssessmentQuestions } from '../../services/company/assessmentQuestion.service'; // 👈 ADD THIS
import type { AuthUser } from '../../types/express.d';

// Local helper type: an Express Request that definitely has a user
type AuthedReq = Request & { user: AuthUser };

// POST /api/employer-assessments
export const createDirect = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const result = await EmployerAssessmentService.create(company_id, req.body);
  res.status(201).json(result);
});

// POST /api/employer-assessments/create-from-request
export const createFromRequest = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const { base, request } = req.body;
  const result = await EmployerAssessmentService.createFromRequest(company_id, base, request);
  res.status(201).json(result);
});

// POST /api/employer-assessments/from-jd
export const createFromJD = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const result = await EmployerAssessmentService.createFromJobDescription(company_id, req.body);
  res.status(201).json(result);
});

// POST /api/employer-assessments/with-chatbot
export const createWithChatbot = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const result = await EmployerAssessmentService.createWithChatbot(company_id, req.body);
  res.status(201).json(result);
});

// POST /api/employer-assessments/chatbot/message
export const sendChatbotMessage = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const { session_id, message } = req.body;

  const result = await EmployerAssessmentService.sendChatbotMessageService(company_id, {
    session_id,
    message,
  });

  res.json(result);
});

// GET /api/employer-assessments/:assessment_id
export const getById = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const { assessment_id } = req.params as { assessment_id: string };
  const result = await EmployerAssessmentService.getById(company_id, assessment_id);
  res.json(result);
});

// GET /api/employer-assessments
export const list = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const { status, job_id } = req.query as { status?: any; job_id?: string };
  const result = await EmployerAssessmentService.list(company_id, { status, job_id });
  res.json(result);
});

// PUT /api/employer-assessments
export const update = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const payload = { ...req.body, company_id }; // prevent spoofing company_id
  const result = await EmployerAssessmentService.update(company_id, payload);
  res.json(result);
});

// PATCH /api/employer-assessments/status
export const updateStatus = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const payload = { ...req.body, company_id };
  const result = await EmployerAssessmentService.updateStatus(company_id, payload);
  res.json(result);
});

// DELETE /api/employer-assessments
export const remove = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const payload = { ...req.body, company_id }; // prevent spoofing company_id
  const result = await EmployerAssessmentService.remove(company_id, payload);
  res.json(result);
});

// POST /api/employer-assessments/:assessment_id/generate-questions
export const generateQuestionsForAssessment = asyncHandler(
  async (req: AuthedReq, res: Response) => {
    const company_id = req.user.user_id;
    const { assessment_id } = req.params as { assessment_id: string };

    // 1) Make sure assessment belongs to this company
    await EmployerAssessmentService.getById(company_id, assessment_id);

    // 2) Generate + attach
    const result = await attachQuestionsToAssessment(assessment_id, req.headers.authorization);

    res.status(200).json({
      status: 'ok',
      message: 'Questions attached successfully',
      result, // { assessment_id, question_count, questions: [...] }
    });
  },
);

// GET /api/employer-assessments/:assessment_id/questions
export const listAssessmentQuestions = asyncHandler(
  async (req: AuthedReq, res: Response) => {
    const company_id = req.user.user_id;
    const { assessment_id } = req.params as { assessment_id: string };

    // Ensure ownership
    await EmployerAssessmentService.getById(company_id, assessment_id);

    const questions = await getQuestionsForAssessment(assessment_id);

    res.json({
      status: 'ok',
      result: {
        assessment_id,
        questions,
      },
    });
  },
);

// PATCH /api/employer-assessments/:assessment_id/questions/:question_id/override
export const updateAssessmentQuestionOverrideController = asyncHandler(
  async (req: AuthedReq, res: Response) => {
    const company_id = req.user.user_id;
    const { assessment_id, question_id } = req.params as {
      assessment_id: string;
      question_id: string;
    };

    // Ensure ownership (assessment belongs to this company)
    await EmployerAssessmentService.getById(company_id, assessment_id);

const result = await updateAssessmentQuestionOverride({
  company_id,
  assessment_id,
  question_id,
  override: req.body ?? null,
});

    res.json({
      status: "ok",
      message: "Override updated",
      result,
    });
  }
);

// POST /api/employer-assessments/:assessment_id/questions/attach
export const attachQuestionsManualController = async (req, res) => {
  try {
    const assessment_id = req.params.assessment_id;

    const ids =
      req.body?.questionIds ??
      req.body?.question_ids ??
      req.body?.ids ??
      [];

    if (!assessment_id) {
      return res.status(400).json({ success: false, error: "assessment_id is required" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "questionIds (array) is required" });
    }

    // ✅ IMPORTANT: ensure assessment belongs to company
    const company_id = req.user?.user_id;
    if (!company_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // ✅ REAL DB ATTACH
    const result = await attachQuestionsByIdsToAssessment({
      company_id,
      assessment_id,
      question_ids: ids,
    });

    return res.json({
      success: true,
      message: "Questions attached",
      result, // keep service return (count, rows, etc.)
    });
  } catch (e: any) {
    console.error("attachQuestionsManualController error:", e);
    return res.status(500).json({ success: false, error: e?.message || "Internal error" });
  }
};


// DELETE /api/employer-assessments/:assessment_id/questions/:question_id
export const detachQuestionController = asyncHandler(
  async (req: AuthedReq, res: Response) => {
    const company_id = req.user.user_id;
    const { assessment_id, question_id } = req.params as {
      assessment_id: string;
      question_id: string;
    };

    await EmployerAssessmentService.getById(company_id, assessment_id);

    const result = await detachQuestionFromAssessment({
      assessment_id,
      question_id,
    });

    res.json({
      status: "ok",
      message: "Question detached",
      result,
    });
  }
);

// PATCH /api/employer-assessments/:assessment_id/questions/reorder
export const reorderAssessmentQuestionsController = asyncHandler(
  async (req: AuthedReq, res: Response) => {
    const company_id = req.user.user_id;
    const { assessment_id } = req.params as { assessment_id: string };

    await EmployerAssessmentService.getById(company_id, assessment_id);

    const { ordered_question_ids } = req.body ?? {};
    const result = await reorderAssessmentQuestions({
      assessment_id,
      ordered_question_ids,
    });

    res.json({
      status: "ok",
      message: "Order updated",
      result,
    });
  }
);
