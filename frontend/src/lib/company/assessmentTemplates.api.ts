// src/lib/company/assessmentTemplates.api.ts
import type {
  AssessmentTemplateDetailsDTO,
  CreateEmployerAssessmentFromTemplateInput,
  CreateEmployerAssessmentFromTemplateResponse,
  PaginatedTemplatesDTO,
} from "@/src/types/assessmentManagement.types";

/** ✅ Standard backend wrapper: { status: "ok", result: ... } */
type ApiOk<T> = {
  status: "ok";
  result: T;
};

function apiBase() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000";
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost<T>(path: string, token: string, body: any): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const AssessmentTemplatesAPI = {
  /** GET /api/v1/assessment-templates */
  list: async (token: string): Promise<PaginatedTemplatesDTO> => {
    const data = await apiGet<ApiOk<PaginatedTemplatesDTO>>(
      "/assessment-templates",
      token
    );
    return data.result;
  },

  /** GET /api/v1/assessment-templates/:templateId */
  getById: async (token: string, templateId: string): Promise<AssessmentTemplateDetailsDTO> => {
    const data = await apiGet<ApiOk<AssessmentTemplateDetailsDTO>>(
      `/assessment-templates/${templateId}`,
      token
    );
    return data.result;
  },

  /** POST /api/v1/employer-assessments/from-template */
  createFromTemplate: async (
    token: string,
    p: CreateEmployerAssessmentFromTemplateInput
  ): Promise<CreateEmployerAssessmentFromTemplateResponse> => {
    const data = await apiPost<ApiOk<CreateEmployerAssessmentFromTemplateResponse>>(
      "/employer-assessments/from-template",
      token,
      p
    );
    return data.result;
  },
};
