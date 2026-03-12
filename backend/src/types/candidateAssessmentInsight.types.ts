/**AI feedback object:

strengths/weaknesses/recommendations + evidence: [{ skill, evidenceQuestionIds: [] }] */
export type SkillEvidenceItem = {
  skill: string;
  evidenceQuestionIds: string[];
  note?: string;
};

export type CandidateAssessmentInsightView = {
  session_id: string;
  assessment_id: string;
  candidate_id: string;

  risk_flags?: string[];
  strengths?: SkillEvidenceItem[];
  weaknesses?: SkillEvidenceItem[];
  recommendations?: SkillEvidenceItem[];

  raw?: any;
  created_at: string; // ISO
};
