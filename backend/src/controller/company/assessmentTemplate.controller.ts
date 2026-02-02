/**
 * Endpoints:

GET /api/assessment-templates → list templates
GET /api/assessment-templates/:template_id → preview template (with questions)
POST /api/employer-assessments/from-template → create employer assessment from a template (attach to job)
 */
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import type { AuthUser } from "../../types/express.d";
import type {
  AssessmentTemplateListFilters,
  CreateEmployerAssessmentFromTemplateRequest,
} from "../../types/assessmentTemplate.types";

import {
  listTemplates,
  getTemplateById,
  createAssessmentFromTemplate,
} from "../../services/company/assessmentTemplate.service";

type AuthedReq = Request & { user: AuthUser };

// GET /api/assessment-templates
export const listTemplatesController = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined) ?? undefined;

  const filters: AssessmentTemplateListFilters = {
    q,
    status: (req.query.status as any) ?? undefined,
    provider: (req.query.provider as any) ?? undefined,
    assessment_type: (req.query.assessment_type as any) ?? undefined,
    difficulty: (req.query.difficulty as any) ?? undefined,
    skill_category: (req.query.skill_category as string | undefined) ?? undefined,
    tag: (req.query.tag as string | undefined) ?? undefined,
    skill: (req.query.skill as string | undefined) ?? undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
  };

  const result = await listTemplates(filters);

  res.json({
    status: "ok",
    result,
  });
});

// GET /api/assessment-templates/:template_id
export const getTemplateByIdController = asyncHandler(async (req: Request, res: Response) => {
  const { template_id } = req.params as { template_id: string };
  const result = await getTemplateById(template_id);

  res.json({
    status: "ok",
    result,
  });
});

// POST /api/employer-assessments/from-template
export const createFromTemplateController = asyncHandler(async (req: AuthedReq, res: Response) => {
  const company_id = req.user.user_id;

  const body = req.body as CreateEmployerAssessmentFromTemplateRequest;

  if (!body?.template_id) {
    res.status(400);
    throw new Error("template_id is required");
  }
  if (!body?.job_id) {
    res.status(400);
    throw new Error("job_id is required");
  }

  const created = await createAssessmentFromTemplate({
    company_id,
    job_id: body.job_id,
    template_id: body.template_id,
    title: body.title,
    description: body.description,
  });

  res.status(201).json({
    status: "ok",
    message: "Assessment created from template",
    result: created,
  });
});
