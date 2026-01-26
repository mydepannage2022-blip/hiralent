import { Prisma, PrismaClient } from "@prisma/client";
import type { InternalCandidateFullProfileDTO } from "../../types/internalCandidates.types";

const fullCandidateInclude = {
  candidateProfile: true,
  candidateSkills: true,
  candidateDocuments: true,
  candidateScore: true,
  candidateVectors: true, // ✅ correct
  profileCompleteness: true,
  certifications: true,
  badges: true,
} satisfies Prisma.UserInclude;

export class InternalCandidatesService {
  constructor(private prisma: PrismaClient) {}

  async getFullCandidateProfile(candidateId: string): Promise<InternalCandidateFullProfileDTO | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: candidateId },
      include: fullCandidateInclude,
    });

    if (!user) return null;

    // ✅ sanitize output (don’t leak password_hash, mfa_secret, etc.)
    return {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,

      phone_number: user.phone_number,
      position: user.position,
      linkedin_url: user.linkedin_url,

      created_at: user.created_at,
      updated_at: user.updated_at,

      candidateProfile: user.candidateProfile,
      candidateSkills: user.candidateSkills,
      candidateDocuments: user.candidateDocuments,
      candidateScore: user.candidateScore,
      candidateVectors: user.candidateVectors,
      profileCompleteness: user.profileCompleteness,
      certifications: user.certifications,
      badges: user.badges,
    };
  }
}
