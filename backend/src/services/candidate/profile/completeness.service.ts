import { PrismaClient } from "@prisma/client";
import { ProfileCompletenessResult } from "../../../types/profile.types";

const prisma = new PrismaClient();

export class CompletenessService {
  /**
   * Calculate profile completeness for a candidate
   * ✅ Section weights (sum=100)
   * ✅ Skills full score at >=5
   * ✅ Experience full score at >=1 (FIX for your 95% case)
   * ✅ Robust resume detection
   * ✅ missing_fields/suggestions stored as Json (no stringify)
   */
  async calculateCompleteness(candidateId: string): Promise<ProfileCompletenessResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: candidateId },
        include: {
          candidateProfile: true,
          candidateSkills: true,
          candidateDocuments: true,
          certifications: true,
        },
      });

      if (!user) throw new Error("Candidate not found");

      const profile = user.candidateProfile;
      const missing_fields: string[] = [];
      const suggestions: string[] = [];

      const W = {
        BASIC_INFO: 25,
        HEADLINE: 10,
        SKILLS: 25,
        EXPERIENCE: 20,
        EDUCATION: 10,
        PROFILE_PICTURE: 5,
        DOCUMENTS: 5,
      };

      let totalPoints = 0;

      // ==================== BASIC INFO (25) ====================
      let basicInfoPoints = 0;

      if (user.full_name?.trim()) basicInfoPoints += 8;
      else missing_fields.push("full_name");

      if (user.email?.trim()) basicInfoPoints += 5;

      if (user.phone_number?.trim()) basicInfoPoints += 4;
      else missing_fields.push("phone_number");

      if (profile?.location?.trim()) basicInfoPoints += 4;
      else missing_fields.push("location");

      if (profile?.about_me?.trim()) basicInfoPoints += 4;
      else missing_fields.push("about_me");

      totalPoints += basicInfoPoints;

      // ==================== HEADLINE (10) ====================
      let headlinePoints = 0;
      if (profile?.headline?.trim()) {
        headlinePoints = W.HEADLINE;
      } else {
        missing_fields.push("headline");
        suggestions.push("Add a professional headline to attract employers");
      }
      totalPoints += headlinePoints;

      // ==================== SKILLS (25) ====================
      const relationSkillsCount = user.candidateSkills?.length || 0;

      const tryGetSkillsArray = (v: unknown): string[] => {
        if (!v) return [];
        if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
        if (typeof v === "string") {
          const s = v.trim();
          if (!s) return [];
          try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
          } catch {
            return [];
          }
        }
        return [];
      };

      const anyProfile = profile as any;
      const jsonSkillsArr =
        tryGetSkillsArray(anyProfile?.skills) ||
        tryGetSkillsArray(anyProfile?.extracted_skills) ||
        tryGetSkillsArray(anyProfile?.highlighted_skills);

      const jsonSkillsCount = Array.isArray(jsonSkillsArr) ? jsonSkillsArr.length : 0;

      const skillsCount = Math.max(relationSkillsCount, jsonSkillsCount);

      let skillsPoints = 0;
      if (skillsCount >= 5) {
        skillsPoints = W.SKILLS; // 25
      } else if (skillsCount >= 3) {
        skillsPoints = Math.round(W.SKILLS * 0.8); // 20
      } else if (skillsCount >= 1) {
        skillsPoints = Math.round(W.SKILLS * 0.4); // 10
      } else {
        missing_fields.push("skills");
        suggestions.push("Add at least 3 relevant skills to improve your profile");
      }

      totalPoints += skillsPoints;

      // ==================== EXPERIENCE (20) ====================
      // ✅ FIX: if there is at least 1 experience entry => FULL 20
      let experiencePoints = 0;
      const expRaw = profile?.experience;

      const parseArrayField = (raw: unknown): any[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === "string") {
          const s = raw.trim();
          if (!s || s === "[]") return [];
          try {
            const parsed = JSON.parse(s);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const experiences = parseArrayField(expRaw);

      if (experiences.length > 0) {
        experiencePoints = W.EXPERIENCE; // ✅ 20/20
      } else {
        missing_fields.push("experience");
        suggestions.push("Add your work experience to show your background");
      }

      totalPoints += experiencePoints;

      // ==================== EDUCATION (10) ====================
      let educationPoints = 0;
      const eduRaw = profile?.education;
      const education = parseArrayField(eduRaw);

      if (education.length > 0) {
        educationPoints = W.EDUCATION; // 10
      } else {
        missing_fields.push("education");
        suggestions.push("Add your educational background");
      }

      totalPoints += educationPoints;

      // ==================== PROFILE PICTURE (5) ====================
      let picturePoints = 0;
      if (profile?.profile_picture_url?.trim()) {
        picturePoints = W.PROFILE_PICTURE;
      } else {
        missing_fields.push("profile_picture");
        suggestions.push("Add a professional profile picture");
      }

      totalPoints += picturePoints;

      // ==================== DOCUMENTS (5) ====================
      const hasResume = user.candidateDocuments.some((doc) => {
        const fileName = (doc.file_name || "").toLowerCase();
        const filePath = (doc.file_path || "").toLowerCase();
        const mime = (doc.file_type || "").toLowerCase();
        const status = (doc.upload_status || "").toLowerCase();

        if (status !== "uploaded") return false;

        const isResumeLike =
          fileName.endsWith(".pdf") ||
          fileName.endsWith(".doc") ||
          fileName.endsWith(".docx") ||
          filePath.includes("/uploads/resumes/") ||
          filePath.includes("/uploads/resumes/cv/") ||
          mime.includes("pdf") ||
          mime.includes("msword") ||
          mime.includes("officedocument") ||
          mime.includes("word");

        return isResumeLike;
      });

      let documentPoints = 0;
      if (hasResume) {
        documentPoints = W.DOCUMENTS;
      } else {
        missing_fields.push("resume_document");
        suggestions.push("Upload your resume for better profile analysis");
      }

      totalPoints += documentPoints;

      // ==================== OVERALL SCORE ====================
      const overall_score = Math.min(Math.round(totalPoints), 100);

      // ==================== SAVE TO DB ====================
      const completenessData = {
        candidate_id: candidateId,
        overall_score,
        basic_info_score: Math.round((basicInfoPoints / W.BASIC_INFO) * 100),
        headline_score: Math.round((headlinePoints / W.HEADLINE) * 100),
        skills_score: Math.round((skillsPoints / W.SKILLS) * 100),
        experience_score: Math.round((experiencePoints / W.EXPERIENCE) * 100),
        education_score: Math.round((educationPoints / W.EDUCATION) * 100),
        profile_picture_score: Math.round((picturePoints / W.PROFILE_PICTURE) * 100),
        document_score: Math.round((documentPoints / W.DOCUMENTS) * 100),
        missing_fields,
        suggestions,
        last_calculated: new Date(),
      };

      await prisma.profileCompleteness.upsert({
        where: { candidate_id: candidateId },
        update: completenessData,
        create: completenessData,
      });

      console.log(`✅ Completeness calculated for ${candidateId}: ${overall_score}%`);
      console.log(`📊 Completeness debug:`, {
        skills_relation: relationSkillsCount,
        skills_json: jsonSkillsCount,
        skills_used: skillsCount,
        hasResume,
        exp_count: experiences.length,
        edu_count: education.length,
        points: {
          basicInfoPoints,
          headlinePoints,
          skillsPoints,
          experiencePoints,
          educationPoints,
          picturePoints,
          documentPoints,
        },
        totalPoints,
      });

      return {
        overall_score,
        basic_info_score: completenessData.basic_info_score,
        skills_score: completenessData.skills_score,
        experience_score: completenessData.experience_score,
        education_score: completenessData.education_score,
        document_score: completenessData.document_score,
        profile_picture_score: completenessData.profile_picture_score,
        headline_score: completenessData.headline_score,
        missing_fields,
        suggestions,
      };
    } catch (error: any) {
      console.error("Error calculating completeness:", error);
      throw new Error(`Failed to calculate completeness: ${error?.message || "Unknown error"}`);
    }
  }

  async getCompleteness(candidateId: string): Promise<ProfileCompletenessResult | null> {
    try {
      const completeness = await prisma.profileCompleteness.findUnique({
        where: { candidate_id: candidateId },
      });

      if (!completeness) return null;

      return {
        overall_score: completeness.overall_score,
        basic_info_score: completeness.basic_info_score,
        skills_score: completeness.skills_score,
        experience_score: completeness.experience_score,
        education_score: completeness.education_score,
        document_score: completeness.document_score,
        profile_picture_score: completeness.profile_picture_score,
        headline_score: completeness.headline_score,
        missing_fields: Array.isArray(completeness.missing_fields)
          ? (completeness.missing_fields as string[])
          : [],
        suggestions: Array.isArray(completeness.suggestions)
          ? (completeness.suggestions as string[])
          : [],
      };
    } catch (error: any) {
      console.error("Error getting completeness:", error);
      throw new Error(`Failed to get completeness: ${error?.message || "Unknown error"}`);
    }
  }

  async canApplyToJob(candidateId: string): Promise<{
    can_apply: boolean;
    reason?: string;
    missing_requirements?: string[];
  }> {
    try {
      const completeness = await this.calculateCompleteness(candidateId);
      const missing_requirements: string[] = [];

      if (completeness.basic_info_score < 60) {
        missing_requirements.push("Complete basic information (name, email, phone, location, about me)");
      }
      if (completeness.skills_score < 40) {
        missing_requirements.push("Add at least 3 skills to your profile");
      }
      if (completeness.document_score < 100) {
        missing_requirements.push("Upload your CV");
      }

      const can_apply = missing_requirements.length === 0;

      return {
        can_apply,
        reason: can_apply ? "Profile meets minimum requirements" : "Profile does not meet minimum requirements",
        missing_requirements: can_apply ? undefined : missing_requirements,
      };
    } catch (error: any) {
      console.error("Error checking apply eligibility:", error);
      throw new Error(`Failed to check eligibility: ${error?.message || "Unknown error"}`);
    }
  }

  async getProfileReadiness(candidateId: string): Promise<{
    is_ready: boolean;
    completeness: number;
    status: "incomplete" | "basic" | "complete" | "excellent";
    next_steps: string[];
  }> {
    try {
      const completeness = await this.calculateCompleteness(candidateId);

      let status: "incomplete" | "basic" | "complete" | "excellent";
      if (completeness.overall_score < 40) status = "incomplete";
      else if (completeness.overall_score < 70) status = "basic";
      else if (completeness.overall_score < 90) status = "complete";
      else status = "excellent";

      return {
        is_ready: completeness.overall_score >= 70,
        completeness: completeness.overall_score,
        status,
        next_steps: (completeness.suggestions || []).slice(0, 3),
      };
    } catch (error: any) {
      console.error("Error getting profile readiness:", error);
      throw new Error(`Failed to get readiness: ${error?.message || "Unknown error"}`);
    }
  }
}

export const completenessService = new CompletenessService();
