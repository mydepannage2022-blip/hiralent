export type SimpleTestInviteStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | string;

export type SimpleTestInviteRow = {
  invite_id: string;
  test_id: string;
  job_id: string;
  application_id: string;
  company_id?: string | null;
  candidate_id?: string | null;
  status: SimpleTestInviteStatus;
  expires_at?: string | Date | null;
  accepted_at?: string | Date | null;
  created_at?: string | Date | null;

  test?: { title?: string | null; time_limit_min?: number | null } | null;
  application?: {
    job?: { title?: string | null; location?: string | null } | null;
  } | null;
};

export type CandidateSimpleTestInvitesResponse = {
  ok: true;
  invites: SimpleTestInviteRow[];
};

export type AcceptSimpleTestInviteResponse = {
  ok: true;
  data: {
    inviteId: string;
    status: string;
    expiresAt: any;
    acceptedAt?: any;
  };
};

export type StartAttemptResponse = {
  ok: true;
  attempt_id: string;
  attempt_no: number;
  expires_at: string | Date | null;
  status: string;
};

export type SimpleTestQuestionDTO = {
  id: string;
  kind: "MCQ" | "CODING" | string;
  order?: number | null;
  title: string;
  difficulty?: string | null;
  skillTags?: string[] | null;
  type?: string | null;

  prompt?: string | null;
  // options may come as any shape from DB — UI will normalize if needed
  options?: any[] | null;
};

export type GetAttemptDTO = {
  attempt_id: string;
  status: string;
  expires_at: string | Date | null;
  test: {
    title: string;
    description?: string | null;
    time_limit_min: number;
    questions: SimpleTestQuestionDTO[];
  };
};

export type SubmitSimpleTestResponse = {
  ok: true;
  score: number;
  alreadySubmitted?: boolean;
};

/** UI payload */
export type SubmitAnswersPayload = Record<
  string,
  | { selectedOptionId: string } // MCQ
  | { code: string; language?: string } // CODING
>;
