// src/lib/company/assessmentTemplates.api.ts
import type {
  AssessmentTemplateDetailsDTO,
  AssessmentTemplateListItemDTO,
  CreateEmployerAssessmentFromTemplateInput,
  CreateEmployerAssessmentFromTemplateResponse,
} from "@/src/types/assessmentManagement.types";

function apiBase() {
  // ✅ adapte selon ton projet (tu utilises déjà NEXT_PUBLIC_BASE_URL)
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
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
  list: (token: string) =>
    apiGet<AssessmentTemplateListItemDTO[]>("/assessment-templates", token),

  getById: (token: string, templateId: string) =>
    apiGet<AssessmentTemplateDetailsDTO>(`/assessment-templates/${templateId}`, token),

  createFromTemplate: (token: string, p: CreateEmployerAssessmentFromTemplateInput) =>
    apiPost<CreateEmployerAssessmentFromTemplateResponse>(
      "/employer-assessments/from-template",
      token,
      p
    ),
};
