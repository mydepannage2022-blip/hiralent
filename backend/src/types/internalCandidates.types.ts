import type {
  BadgeAward,
  CandidateDocument,
  CandidateProfile,
  CandidateScore,
  CandidateVector,
  Certification,
  ProfileCompleteness,
  CandidateSkill,
} from "@prisma/client";

export type InternalCandidateFullProfileDTO = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;

  phone_number?: string | null;
  position?: string | null;
  linkedin_url?: string | null;

  created_at: Date;
  updated_at: Date;

  candidateProfile: CandidateProfile | null;
  candidateSkills: CandidateSkill[];
  candidateDocuments: CandidateDocument[];
  candidateScore: CandidateScore | null;

  // ✅ MUST be arrays (because your Prisma User model defines them as arrays)
  candidateVectors: CandidateVector[];
  profileCompleteness: ProfileCompleteness[];

  certifications: Certification[];
  badges: BadgeAward[];
};
