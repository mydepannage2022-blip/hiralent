import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import EmployerAssessmentService from '../../services/company/employerAssessment.service';
import type { AuthUser } from '../../types/express.d'; // keep your file as-is

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

// DELETE /api/employer-assessments
export const remove = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;
  const payload = { ...req.body, company_id }; // prevent spoofing company_id
  const result = await EmployerAssessmentService.remove(company_id, payload);
  res.json(result);
});
