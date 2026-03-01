// src/types/invites.types.ts

export type AssessmentInviteRow = {
  invite_id: string;
  application_id?: string | null;
  job_id?: string | null;
  company_id?: string | null;
  candidate_id?: string | null;
  assessment_id?: string | null;

  status?: string;
  expires_at?: string | Date | null;
  created_at?: string | Date | null;

  assessment?: { title?: string | null; time_limit?: number | null } | null;
  application?: { job?: { title?: string | null } | null } | null;
};

export type CandidateInvitesListResponse = {
  ok: true;
  invites: AssessmentInviteRow[];
};

export type CandidateInviteAcceptResponse = {
  ok: true;
  data: {
    inviteId: string;
    status: string;
    expiresAt: string;
  };
};

export type UiAssessmentInvite = {
  inviteId: string;
  applicationId?: string | null;
  jobId?: string | null;
  assessmentId?: string | null;
  status: string;

  jobTitle?: string | null;
  assessmentTitle?: string | null;

  expiresAt?: string | null;
  createdAt?: string | null;

  durationMin?: number | null;
};

export type UiAcceptInviteResult = {
  inviteId: string;
  status: string;
  expiresAt: string;
};
