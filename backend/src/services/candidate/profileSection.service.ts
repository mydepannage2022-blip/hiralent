import { PrismaClient } from "@prisma/client";
import {
  CandidateSkillInput,
  ExperienceInput,
  EducationInput,
  SocialLink,
  JobBenefit
} from "../../types/candidate.types";

const prisma = new PrismaClient();

export const processSkillsUpdate = async (
  candidateId: string,
  skills: CandidateSkillInput[]
): Promise<{ skillsCount: number }> => {
  try {
    const existingSkills = await prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId }
    });

    const existingSkillMap = new Map(
      existingSkills.map(skill => [skill.skill_id, skill])
    );

    const incomingSkillsWithId = skills.filter(skill => skill.skill_id);
    const incomingSkillsWithoutId = skills.filter(skill => !skill.skill_id);

    const toDelete = existingSkills.filter(
      existing => !incomingSkillsWithId.some(incoming => incoming.skill_id === existing.skill_id)
    );

    const toUpdate = incomingSkillsWithId.filter(
      skill => existingSkillMap.has(skill.skill_id!)
    );

    const toCreate = incomingSkillsWithoutId;

    await prisma.$transaction(async (tx) => {
      if (toDelete.length > 0) {
        await tx.candidateSkill.deleteMany({
          where: {
            skill_id: { in: toDelete.map(s => s.skill_id) },
            candidate_id: candidateId
          }
        });
      }

      for (const skill of toUpdate) {
        await tx.candidateSkill.update({
          where: { skill_id: skill.skill_id! },
          data: {
            skill_name: skill.skill_name.trim(),
            skill_category: skill.skill_category,
            proficiency: skill.proficiency,
            years_experience: skill.years_experience || 0,
            updated_at: new Date()
          }
        });
      }

      if (toCreate.length > 0) {
        await tx.candidateSkill.createMany({
          data: toCreate.map(skill => ({
            candidate_id: candidateId,
            skill_name: skill.skill_name.trim(),
            skill_category: skill.skill_category,
            proficiency: skill.proficiency,
            years_experience: skill.years_experience || 0,
            source_type: "manual_entry",
            is_verified: false
          }))
        });
      }
    });

    const finalCount = await prisma.candidateSkill.count({
      where: { candidate_id: candidateId }
    });

    return { skillsCount: finalCount };
  } catch (error) {
    console.error("Error in processSkillsUpdate:", error);
    throw new Error(`Skills processing failed: ${error.message || "Unknown error"}`);
  }
};

export const processExperienceUpdate = async (
  candidateId: string,
  experiences: ExperienceInput[]
): Promise<void> => {
  try {
    const validatedExperiences = experiences.map((exp, index) => {
      if (!exp.job_title || exp.job_title.trim().length === 0) {
        throw new Error(`Experience ${index + 1}: Job title is required`);
      }
      if (!exp.company || exp.company.trim().length === 0) {
        throw new Error(`Experience ${index + 1}: Company name is required`);
      }
      if (!exp.description || exp.description.trim().length < 10) {
        throw new Error(`Experience ${index + 1}: Description must be at least 10 characters`);
      }

      return {
        ...exp,
        job_title: exp.job_title.trim(),
        company: exp.company.trim(),
        description: exp.description.trim(),
        duration: exp.duration.trim(),
        years: Math.max(0, exp.years),
        currently_working: exp.currently_working || false,
        start_date: exp.start_date || null,
        end_date: exp.end_date || null
      };
    });

    validatedExperiences.sort((a, b) => {
      if (a.currently_working && !b.currently_working) return -1;
      if (!a.currently_working && b.currently_working) return 1;
      return b.years - a.years;
    });

    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        experience: JSON.stringify(validatedExperiences),
        updated_at: new Date()
      },
      create: {
        candidate_id: candidateId,
        experience: JSON.stringify(validatedExperiences)
      }
    });

  } catch (error) {
    console.error("Error in processExperienceUpdate:", error);
    throw new Error(`Experience processing failed: ${error.message || "Unknown error"}`);
  }
};

export const processEducationUpdate = async (
  candidateId: string,
  education: EducationInput[]
): Promise<void> => {
  try {
    const validatedEducation = education.map((edu, index) => {
      if (!edu.degree || edu.degree.trim().length === 0) {
        throw new Error(`Education ${index + 1}: Degree is required`);
      }
      if (!edu.institution || edu.institution.trim().length === 0) {
        throw new Error(`Education ${index + 1}: Institution is required`);
      }
      if (!edu.field || edu.field.trim().length === 0) {
        throw new Error(`Education ${index + 1}: Field of study is required`);
      }

      return {
        ...edu,
        degree: edu.degree.trim(),
        institution: edu.institution.trim(),
        field: edu.field.trim(),
        year: edu.year.trim(),
        grade: edu.grade?.trim() || null,
        currently_studying: edu.currently_studying || false
      };
    });

    validatedEducation.sort((a, b) => {
      if (a.currently_studying && !b.currently_studying) return -1;
      if (!a.currently_studying && b.currently_studying) return 1;
      
      const extractYear = (yearStr: string): number => {
        const years = yearStr.match(/\d{4}/g);
        return years ? parseInt(years[years.length - 1]) : 0;
      };
      
      return extractYear(b.year) - extractYear(a.year);
    });

    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        education: JSON.stringify(validatedEducation),
        updated_at: new Date()
      },
      create: {
        candidate_id: candidateId,
        education: JSON.stringify(validatedEducation)
      }
    });

  } catch (error) {
    console.error("Error in processEducationUpdate:", error);
    throw new Error(`Education processing failed: ${error.message || "Unknown error"}`);
  }
};

export const validateProfileData = async (data: {
  links?: SocialLink[];
  jobBenefits?: JobBenefit[];
}): Promise<void> => {
  try {
    if (data.links) {
      const platforms = new Set();
      
      for (const link of data.links) {
        if (platforms.has(link.platform)) {
          throw new Error(`Duplicate platform found: ${link.platform}`);
        }
        platforms.add(link.platform);

        try {
          new URL(link.url);
        } catch {
          throw new Error(`Invalid URL for ${link.platform}: ${link.url}`);
        }

        if (link.platform === 'github' && !link.url.includes('github.com')) {
          throw new Error("GitHub URL must contain 'github.com'");
        }
        if (link.platform === 'linkedin' && !link.url.includes('linkedin.com')) {
          throw new Error("LinkedIn URL must contain 'linkedin.com'");
        }
      }
    }

    if (data.jobBenefits) {
      const benefitTypes = new Set();
      
      for (const benefit of data.jobBenefits) {
        if (benefitTypes.has(benefit.benefit_type)) {
          throw new Error(`Duplicate benefit type found: ${benefit.benefit_type}`);
        }
        benefitTypes.add(benefit.benefit_type);

        if (benefit.notes && benefit.notes.length > 200) {
          throw new Error(`Notes for ${benefit.benefit_type} exceed 200 characters`);
        }
      }
    }

  } catch (error) {
    console.error("Error in validateProfileData:", error);
    throw new Error(`Profile data validation failed: ${error.message || "Unknown error"}`);
  }
};

export const getProfileSectionStats = async (candidateId: string) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId }
    });

    const skillsCount = await prisma.candidateSkill.count({
      where: { candidate_id: candidateId }
    });

    let experienceCount = 0;
    let educationCount = 0;
    let linksCount = 0;
    let benefitsCount = 0;

    if (profile) {
      try {
        experienceCount = profile.experience ? JSON.parse(profile.experience).length : 0;
      } catch (e) {
        experienceCount = 0;
      }

      try {
        educationCount = profile.education ? JSON.parse(profile.education).length : 0;
      } catch (e) {
        educationCount = 0;
      }

      try {
        linksCount = profile.links ? JSON.parse(profile.links).length : 0;
      } catch (e) {
        linksCount = 0;
      }

      try {
        benefitsCount = profile.job_benefits ? JSON.parse(profile.job_benefits).length : 0;
      } catch (e) {
        benefitsCount = 0;
      }
    }

    return {
      skills: skillsCount,
      experience: experienceCount,
      education: educationCount,
      links: linksCount,
      job_benefits: benefitsCount
    };
  } catch (error) {
    console.error("Error getting profile section stats:", error);
    throw new Error("Failed to get profile section statistics");
  }
};
