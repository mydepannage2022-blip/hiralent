// src/lib/invites/invites.api.ts
import { apiFetch } from "@/src/lib/api/apiClient";
import type {
  CandidateInvitesListResponse,
  CandidateInviteAcceptResponse,
  UiAssessmentInvite,
  UiAcceptInviteResult,
} from "@/src/types/invites.types";

function toIso(v: any): string | null {
  if (!v) return null;
  try {
    const d = typeof v === "string" ? new Date(v) : v instanceof Date ? v : new Date(String(v));
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

export async function listAssessmentInvites(): Promise<UiAssessmentInvite[]> {
  const res = await apiFetch<CandidateInvitesListResponse>("CANDIDATE", `/candidate/assessment-invites`);

  return (res.invites ?? []).map((inv) => ({
    inviteId: inv.invite_id,
    applicationId: inv.application_id ?? null,
    jobId: inv.job_id ?? null,
    assessmentId: inv.assessment_id ?? null,
    status: String((inv as any).status ?? "PENDING").toUpperCase(),
    jobTitle: inv.application?.job?.title ?? null,
    assessmentTitle: inv.assessment?.title ?? null,

    expiresAt: toIso(inv.expires_at),
    createdAt: toIso(inv.created_at),

    durationMin: inv.assessment?.time_limit ?? null,
  }));
}

export async function acceptAssessmentInvite(inviteId: string): Promise<UiAcceptInviteResult> {
  const res = await apiFetch<CandidateInviteAcceptResponse>(
    "CANDIDATE",
    `/candidate/assessment-invites/${inviteId}/accept`,
    { method: "POST", body: JSON.stringify({}) },
  );

  return {
    inviteId: res.data.inviteId,
    status: res.data.status,
    expiresAt: res.data.expiresAt,
  };
}
