export interface SkillRadarPoint {
  label: string;  // e.g. "React Basics" or "Algorithms"
  score: number;  // 0–100 normalized
}

export interface CandidateSkillRadar {
  candidateId: string;
  candidateName: string;
  jobId?: string | null;
  employerAssessmentId?: string | null;
  overallScore?: number | null;
  skillLevel?: string | null; // from AssessmentSummary.skill_level
  radar: SkillRadarPoint[];
}

export interface AssessmentSkillRadarResponse {
  assessmentId: string;
  jobId: string;
  companyId: string;
  title: string;
  candidates: CandidateSkillRadar[];
}
