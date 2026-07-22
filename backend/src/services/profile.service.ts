import { PrismaClient } from "@prisma/client";
import {
  UpdateBasicInfoInput,
  BasicInfoUpdateResult,
  UpdateSkillsInput,
  AddSkillInput,
  SkillUpdateResult,
  UpdateExperienceInput,
  AddExperienceInput,
  ExperienceUpdateResult,
  UpdateEducationInput,
  AddEducationInput,
  EducationUpdateResult,
  UpdateLinksInput,
  LinksUpdateResult,
  UpdateJobBenefitsInput,
  JobBenefitsUpdateResult,
  BulkProfileUpdateInput,
  BulkProfileUpdateResult,
  SocialLink,
  JobBenefit,
  CandidateServiceError,
  APIResponse,
  UpdateProjectsInput, 
  ProjectsUpdateResult,
} from "../types/candidate.types";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import { processDocumentAsync } from "./candidate/documentProcessor.service";

import {
  processSkillsUpdate,
  processExperienceUpdate,
  processEducationUpdate,
  validateProfileData
} from "./candidate/profileSection.service";
import { cleanupTempFile, cleanupOldApplicationResume } from "./candidate/cleanup.service";
import path from 'path';
import { triggerCandidateMatching } from "./matching/candidate-outbox.service"; // I added This line (Ihssane)
const prisma = new PrismaClient();

export const updateBasicInfo = async (
  candidateId: string,
  data: UpdateBasicInfoInput
): Promise<BasicInfoUpdateResult> => {
  
  try {
    const updatedFields: string[] = [];

    const userUpdateData: any = {};
    if (data.full_name !== undefined) {
      userUpdateData.full_name = data.full_name;
      updatedFields.push('full_name');
    }
    if (data.phone_number !== undefined) {
      userUpdateData.phone_number = data.phone_number;
      updatedFields.push('phone_number');
    }

    const profileUpdateData: any = {};
    if (data.about_me !== undefined) {
      profileUpdateData.about_me = data.about_me;
      updatedFields.push('about_me');
    }
    if (data.location !== undefined) {
      profileUpdateData.location = data.location;
      updatedFields.push('location');
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { user_id: candidateId },
        data: userUpdateData
      });
    }

    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.candidateProfile.upsert({
        where: { candidate_id: candidateId },
        update: {
          ...profileUpdateData,
          updated_at: new Date()
        },
        create: {
          candidate_id: candidateId,
          ...profileUpdateData
        }
      });
    }

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);

if (updatedFields.includes("about_me")) {
  await triggerCandidateMatching(candidateId, "updateBasicInfo").catch(e =>
    console.warn("Failed to trigger matching:", e)
  );
}


    return {
      success: true,
      message: `Successfully updated ${updatedFields.join(', ')}`,
      updated_fields: updatedFields
    };
  } catch (error) {
    console.error("Error updating basic info:", error);
    throw new Error(`Failed to update basic info: ${error.message || "Unknown error"}`);
  }
};

export const updateSkills = async (
  candidateId: string,
  data: UpdateSkillsInput
): Promise<SkillUpdateResult> => {
  try {
    const result = await processSkillsUpdate(candidateId, data.skills);
    
    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);

   await triggerCandidateMatching(candidateId, "updateSkills").catch(e => 
      console.warn("Failed to trigger matching:", e)
   );

    return {
      success: true,
      message: `Successfully updated ${data.skills.length} skills`,
      skills_count: result.skillsCount
    };
  } catch (error) {
    console.error("Error updating skills:", error);
    throw new Error(`Failed to update skills: ${error.message || "Unknown error"}`);
  }
};

export const addSkill = async (
  candidateId: string,
  data: AddSkillInput
): Promise<SkillUpdateResult> => {
  try {
    const existingSkill = await prisma.candidateSkill.findFirst({
      where: {
        candidate_id: candidateId,
        skill_name: { equals: data.skill_name, mode: 'insensitive' }
      }
    });

    if (existingSkill) {
      throw new Error("Skill already exists");
    }

    // Transaction : insert dans CandidateSkill + sync CandidateProfile.skills
    const { skillsCount } = await prisma.$transaction(async (tx) => {
      // 1. Insérer le nouveau skill
      await tx.candidateSkill.create({
        data: {
          candidate_id: candidateId,
          skill_name: data.skill_name,
          skill_category: data.skill_category,
          proficiency: data.proficiency,
          years_experience: data.years_experience || 0,
          confidence_score: 1.0,
          source_type: "manual_entry",
          is_verified: true,
        },
      });

      // 2. Relire tous les skills pour avoir la liste complète et à jour
      const allSkills = await tx.candidateSkill.findMany({
        where: { candidate_id: candidateId },
        select: { skill_name: true },
      });

      // 3. Sync vers CandidateProfile.skills (source secondaire)
      await tx.candidateProfile.upsert({
        where: { candidate_id: candidateId },
        update: {
          skills: allSkills.map((s) => s.skill_name),
          updated_at: new Date(),
        },
        create: {
          candidate_id: candidateId,
          skills: allSkills.map((s) => s.skill_name),
        },
      });

      return { skillsCount: allSkills.length };
    });

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);

    await triggerCandidateMatching(candidateId, "addSkill").catch((e) =>
      console.warn("Failed to trigger matching:", e)
    );

    return {
      success: true,
      message: `Successfully added skill: ${data.skill_name}`,
      skills_count: skillsCount,
    };
  } catch (error) {
    console.error("Error adding skill:", error);
    throw new Error(`Failed to add skill: ${error.message || "Unknown error"}`);
  }
};

export const deleteSkill = async (
  candidateId: string,
  skillId: string
): Promise<SkillUpdateResult> => {
  try {
    const skill = await prisma.candidateSkill.findFirst({
      where: { 
        skill_id: skillId,
        candidate_id: candidateId
      }
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    await prisma.candidateSkill.delete({
      where: { skill_id: skillId }
    });

    const skillsCount = await prisma.candidateSkill.count({
      where: { candidate_id: candidateId }
    });

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);
    await triggerCandidateMatching(candidateId, "deleteSkill").catch(e =>
  console.warn("Failed to trigger matching:", e)
);

    return {
      success: true,
      message: `Successfully deleted skill: ${skill.skill_name}`,
      skills_count: skillsCount
    };
  } catch (error) {
    console.error("Error deleting skill:", error);
    throw new Error(`Failed to delete skill: ${error.message || "Unknown error"}`);
  }
};

export const updateExperience = async (
  candidateId: string,
  data: UpdateExperienceInput
): Promise<ExperienceUpdateResult> => {
  try {
    await processExperienceUpdate(candidateId, data.experiences);

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);
    
    // Après calculateProfileCompleteness
await triggerCandidateMatching(candidateId, "updateExperience").catch(e => 
  console.warn("Failed to trigger matching:", e)
);

    return {
      success: true,
      message: `Successfully updated ${data.experiences.length} experience entries`,
      experiences_count: data.experiences.length
    };
  } catch (error) {
    console.error("Error updating experience:", error);
    throw new Error(`Failed to update experience: ${error.message || "Unknown error"}`);
  }
};

export const addExperience = async (
  candidateId: string,
  data: AddExperienceInput
): Promise<ExperienceUpdateResult> => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId }
    });

    let experiences = [];
    if (profile?.experience) {
      try {
        experiences = JSON.parse(profile.experience);
      } catch (e) {
        experiences = [];
      }
    }

    experiences.push(data);

    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        experience: JSON.stringify(experiences),
        updated_at: new Date()
      },
      create: {
        candidate_id: candidateId,
        experience: JSON.stringify(experiences)
      }
    });

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);
    // Après calculateProfileCompleteness
await triggerCandidateMatching(candidateId, "addExperience").catch(e => 
  console.warn("Failed to trigger matching:", e)
);
    return {
      success: true,
      message: `Successfully added experience: ${data.job_title} at ${data.company}`,
      experiences_count: experiences.length
    };
  } catch (error) {
    console.error("Error adding experience:", error);
    throw new Error(`Failed to add experience: ${error.message || "Unknown error"}`);
  }
};

export const updateEducation = async (
  candidateId: string,
  data: UpdateEducationInput
): Promise<EducationUpdateResult> => {
  try {
    await processEducationUpdate(candidateId, data.education);

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);
    // Après calculateProfileCompleteness
await triggerCandidateMatching(candidateId, "updateEducation").catch(e => 
  console.warn("Failed to trigger matching:", e)
); 
    return {
      success: true,
      message: `Successfully updated ${data.education.length} education entries`,
      education_count: data.education.length
    };
  } catch (error) {
    console.error("Error updating education:", error);
    throw new Error(`Failed to update education: ${error.message || "Unknown error"}`);
  }
};

export const addEducation = async (
  candidateId: string,
  data: AddEducationInput
): Promise<EducationUpdateResult> => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId }
    });

    let education = [];
    if (profile?.education) {
      try {
        education = JSON.parse(profile.education);
      } catch (e) {
        education = [];
      }
    }

    education.push(data);

    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        education: JSON.stringify(education),
        updated_at: new Date()
      },
      create: {
        candidate_id: candidateId,
        education: JSON.stringify(education)
      }
    });

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);
     // Après calculateProfileCompleteness
await triggerCandidateMatching(candidateId, "addEducation").catch(e => 
  console.warn("Failed to trigger matching:", e)
); 
    return {
      success: true,
      message: `Successfully added education: ${data.degree} from ${data.institution}`,
      education_count: education.length
    };
  } catch (error) {
    console.error("Error adding education:", error);
    throw new Error(`Failed to add education: ${error.message || "Unknown error"}`);
  }
};

export const updateLinks = async (
  candidateId: string,
  data: UpdateLinksInput
): Promise<LinksUpdateResult> => {
  try {
    await validateProfileData({ links: data.links });

    const links = normalizeLinks(data.links || []);

    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: { links: JSON.stringify(links), updated_at: new Date() },
      create: { candidate_id: candidateId, links: JSON.stringify(links) }
    });

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);

    return {
      success: true,
      message: `Successfully updated ${links.length} social links`,
      links_count: links.length
    };
  } catch (error: any) {
    console.error("Error updating links:", error);
    throw new Error(`Failed to update links: ${error.message || "Unknown error"}`);
  }
};


export const addLink = async (
  candidateId: string,
  linkData: SocialLink
): Promise<LinksUpdateResult> => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId }
    });

    let links: SocialLink[] = [];
    if (profile?.links) {
      try {
        links = JSON.parse(profile.links);
      } catch (e) {
        links = [];
      }
    }

    const p = normalizePlatform(linkData.platform);
    const u = canonicalizeUrl(linkData.url);
    const exists = links.some(l => normalizePlatform(l.platform) === p && canonicalizeUrl(l.url).toLowerCase() === u.toLowerCase());
    if (exists) throw new Error("Link already exists");


    links.push(linkData);

    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        links: JSON.stringify(links),
        updated_at: new Date()
      },
      create: {
        candidate_id: candidateId,
        links: JSON.stringify(links)
      }
    });

    return {
      success: true,
      message: `Successfully added ${linkData.platform} link`,
      links_count: links.length
    };
  } catch (error) {
    console.error("Error adding link:", error);
    throw new Error(`Failed to add link: ${error.message || "Unknown error"}`);
  }
};

export const deleteLink = async (
  candidateId: string,
  linkIndex: number
): Promise<LinksUpdateResult> => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId }
    });

    if (!profile?.links) {
      throw new Error("No links found");
    }

    let links: SocialLink[] = [];
    try {
      links = JSON.parse(profile.links);
    } catch (e) {
      throw new Error("Invalid links data");
    }

    if (linkIndex < 0 || linkIndex >= links.length) {
      throw new Error("Link index out of range");
    }

    const deletedLink = links[linkIndex];
    links.splice(linkIndex, 1);

    await prisma.candidateProfile.update({
      where: { candidate_id: candidateId },
      data: {
        links: JSON.stringify(links),
        updated_at: new Date()
      }
    });

    return {
      success: true,
      message: `Successfully deleted ${deletedLink.platform} link`,
      links_count: links.length
    };
  } catch (error) {
    console.error("Error deleting link:", error);
    throw new Error(`Failed to delete link: ${error.message || "Unknown error"}`);
  }
};

export const updateJobBenefits = async (
  candidateId: string,
  data: UpdateJobBenefitsInput
): Promise<JobBenefitsUpdateResult> => {
  try {
    await validateProfileData({ jobBenefits: data.job_benefits });

    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        job_benefits: JSON.stringify(data.job_benefits),
        updated_at: new Date()
      },
      create: {
        candidate_id: candidateId,
        job_benefits: JSON.stringify(data.job_benefits)
      }
    });

    return {
      success: true,
      message: `Successfully updated ${data.job_benefits.length} job benefit preferences`,
      benefits_count: data.job_benefits.length
    };
  } catch (error) {
    console.error("Error updating job benefits:", error);
    throw new Error(`Failed to update job benefits: ${error.message || "Unknown error"}`);
  }
};

export const bulkUpdateProfile = async (
  candidateId: string,
  data: BulkProfileUpdateInput
): Promise<BulkProfileUpdateResult> => {
  try {
    const updatedSections: string[] = [];

    if (data.basic_info) {
      await updateBasicInfo(candidateId, data.basic_info);
      updatedSections.push('basic_info');
    }

    if (data.skills) {
      await updateSkills(candidateId, { skills: data.skills });
      updatedSections.push('skills');
    }

    if (data.experience) {
      await updateExperience(candidateId, { experiences: data.experience });
      updatedSections.push('experience');
    }

    if (data.education) {
      await updateEducation(candidateId, { education: data.education });
      updatedSections.push('education');
    }

    if (data.links) {
      await updateLinks(candidateId, { links: data.links });
      updatedSections.push('links');
    }

    if (data.job_benefits) {
      await updateJobBenefits(candidateId, { job_benefits: data.job_benefits });
      updatedSections.push('job_benefits');
    }

    const { calculateProfileCompleteness } = await import("./candidate.service");
    const completeness = await calculateProfileCompleteness(candidateId);

    return {
      success: true,
      message: `Successfully updated ${updatedSections.join(', ')} sections`,
      updated_sections: updatedSections,
      new_completion_score: completeness.overall_score
    };
  } catch (error) {
    console.error("Error in bulk profile update:", error);
    throw new Error(`Failed to update profile: ${error.message || "Unknown error"}`);
  }
};
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || process.env.MATCHING_AI_BASE_URL;
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

async function triggerResumeExtraction(params: {
  candidateId: string;
  documentId: string;
  filePath: string;
  fileType: string;
}) {
  const { candidateId, documentId, filePath, fileType } = params;

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL (or MATCHING_AI_BASE_URL) is not set");
  }

  // ✅ CHANGE THIS PATH to match your ai-service endpoint
  // Example: /resume/extract or /api/v1/resume/extract etc.
  const url = `${AI_SERVICE_URL}/resume/extract`;

  const headers: Record<string, string> = {};
  if (INTERNAL_SERVICE_KEY) headers["x-internal-key"] = INTERNAL_SERVICE_KEY;

  const res = await axios.post(
    url,
    {
      candidate_id: candidateId,
      document_id: documentId,
      file_path: filePath,
      file_type: fileType,
    },
    { headers, timeout: 120000 }
  );

  return res.data;
}

export const uploadApplicationResume = async (
  candidateId: string,
  file: Express.Multer.File
) => {
  let tempFilePath: string | null = null;

  try {
    if (!candidateId) throw new Error("Candidate ID is required");
    if (!file || !file.path || !fs.existsSync(file.path)) {
      throw new Error("File not found after upload");
    }

    tempFilePath = file.path;

    const uploadDir = path.join(process.cwd(), "uploads", "resumes", "application");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // Delete old local resume (only if stored as /uploads/...)
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
      select: { resume_application_url: true },
    });

    if (existingProfile?.resume_application_url?.startsWith("/uploads/")) {
      const oldFilePath = path.join(
        process.cwd(),
        existingProfile.resume_application_url.replace(/^\//, "")
      );
      if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
    }

    // Build safe extension
    const extWithDot = path.extname(file.originalname || "").toLowerCase();
    const safeExt = extWithDot && extWithDot.length <= 6 ? extWithDot : ".pdf";
    const ext = safeExt.replace(".", "");

    const filename = `application_resume_${candidateId}_${Date.now()}.${ext}`;
    const destinationPath = path.join(uploadDir, filename);

    // Move file to final location
    fs.renameSync(tempFilePath, destinationPath);
    tempFilePath = null;

    // Store as relative URL
    const fileUrl = `/uploads/resumes/application/${filename}`;

    // Save into CandidateProfile
    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: { resume_application_url: fileUrl, updated_at: new Date() },
      create: { candidate_id: candidateId, resume_application_url: fileUrl },
    });

    // ✅ Create CandidateDocument (ONLY fields that exist in schema)
    const doc = await prisma.candidateDocument.create({
      data: {
        candidate_id: candidateId,
        file_name: file.originalname,
        file_path: destinationPath,
        file_type: ext.toUpperCase(), // schema = String, keep it simple ("PDF", "DOCX", etc.)
        file_size: file.size,
        upload_status: "uploaded",      // REQUIRED
        extraction_status: "pending",   // optional in schema but good to set
      },
      select: { document_id: true },
    });


    //  Kick off extraction in background (so the upload API responds immediately)
// Kick off extraction in background + trigger matching after success
setImmediate(() => {
  processDocumentAsync(doc.document_id, candidateId, destinationPath)
    .then(() => triggerCandidateMatching(candidateId, "application_resume_extracted"))
    .catch((e) =>
      console.error("❌ processDocumentAsync(application) failed:", e?.message || e)
    );
});

    

    // Optional: create SkillExtraction row if your table exists
    const hasSkillExtraction = (prisma as any).skillExtraction?.create;
    if (hasSkillExtraction) {
      await (prisma as any).skillExtraction.create({
        data: {
          candidate_id: candidateId,
          document_id: doc.document_id,
          status: "pending",
          ai_provider: "gemini",
        },
      });
    }

    return {
      success: true,
      data: {
        resume_application_url: fileUrl,
        file_name: file.originalname,
        document_id: doc.document_id,
      },
      message: "Application resume uploaded successfully",
    };
  } catch (error: any) {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    throw new Error(`Application resume upload failed: ${error?.message || "Unknown error"}`);
  }
};

export const updateProjects = async (
  candidateId: string,
  data: UpdateProjectsInput
): Promise<ProjectsUpdateResult> => {
  try {
    await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        projects: JSON.stringify(data.projects),
        updated_at: new Date(),
      },
      create: {
        candidate_id: candidateId,
        projects: JSON.stringify(data.projects),
      },
    });

    const { calculateProfileCompleteness } = await import("./candidate.service");
    await calculateProfileCompleteness(candidateId);

    return {
      success: true,
      message: `Successfully updated ${data.projects.length} projects`,
      projects_count: data.projects.length,
    };
  } catch (error: any) {
    console.error("Error updating projects:", error);
    throw new Error(`Failed to update projects: ${error.message || "Unknown error"}`);
  }
};

type LanguageData = {
  language: string;
  proficiency: "native" | "fluent" | "advanced" | "intermediate" | "basic";
};

function parseJsonArray<T>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeLanguages(arr: any[]): LanguageData[] {
  return arr
    .map((x) => ({
      language: String(x?.language ?? "").trim(),
      proficiency: (String(x?.proficiency ?? "intermediate") as LanguageData["proficiency"]),
    }))
    .filter((x) => x.language.length > 0)
    .map((x) => ({
      ...x,
      proficiency: (["native", "fluent", "advanced", "intermediate", "basic"].includes(x.proficiency)
        ? x.proficiency
        : "intermediate") as LanguageData["proficiency"],
    }));
}

//  GET
export async function getLanguages(candidateId: string) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { candidate_id: candidateId },
    select: { languages: true },
  });

  const languages = normalizeLanguages(parseJsonArray<LanguageData>(profile?.languages));
  return { languages };
}

//  PUT (bulk replace)
export async function updateLanguages(candidateId: string, languagesInput: LanguageData[]) {
  const languages = normalizeLanguages(languagesInput ?? []);

  await prisma.candidateProfile.upsert({
    where: { candidate_id: candidateId },
    update: { languages: JSON.stringify(languages), updated_at: new Date() },
    create: { candidate_id: candidateId, languages: JSON.stringify(languages) },
  });

  const { calculateProfileCompleteness } = await import("./candidate.service");
  await calculateProfileCompleteness(candidateId);

  return {
    success: true,
    message: `Successfully updated ${languages.length} languages`,
    languages_count: languages.length,
    languages,
  };
}

//  POST (add one)
export async function addLanguage(candidateId: string, input: LanguageData) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { candidate_id: candidateId },
    select: { languages: true },
  });

  const current = normalizeLanguages(parseJsonArray<LanguageData>(profile?.languages));

  // avoid duplicates by language name (case-insensitive)
  const exists = current.some((l) => l.language.toLowerCase() === input.language.trim().toLowerCase());
  if (exists) throw new Error("Language already exists");

  const next = normalizeLanguages([...current, input]);

  await prisma.candidateProfile.upsert({
    where: { candidate_id: candidateId },
    update: { languages: JSON.stringify(next), updated_at: new Date() },
    create: { candidate_id: candidateId, languages: JSON.stringify(next) },
  });

  const { calculateProfileCompleteness } = await import("./candidate.service");
  await calculateProfileCompleteness(candidateId);

  return {
    success: true,
    message: `Successfully added language: ${input.language}`,
    languages_count: next.length,
    languages: next,
  };
}

//  DELETE (remove by index)
export async function deleteLanguage(candidateId: string, index: number) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { candidate_id: candidateId },
    select: { languages: true },
  });

  const current = normalizeLanguages(parseJsonArray<LanguageData>(profile?.languages));

  if (index < 0 || index >= current.length) {
    throw new Error("Language index out of range");
  }

  const removed = current[index];
  const next = current.filter((_, i) => i !== index);

  await prisma.candidateProfile.upsert({
    where: { candidate_id: candidateId },
    update: { languages: JSON.stringify(next), updated_at: new Date() },
    create: { candidate_id: candidateId, languages: JSON.stringify(next) },
  });

  const { calculateProfileCompleteness } = await import("./candidate.service");
  await calculateProfileCompleteness(candidateId);

  return {
    success: true,
    message: `Successfully deleted language: ${removed.language}`,
    languages_count: next.length,
    languages: next,
  };
}

//  OPTIONAL: PATCH (update one entry by index)
export async function updateLanguageAtIndex(
  candidateId: string,
  index: number,
  patch: Partial<LanguageData>
) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { candidate_id: candidateId },
    select: { languages: true },
  });

  const current = normalizeLanguages(parseJsonArray<LanguageData>(profile?.languages));

  if (index < 0 || index >= current.length) {
    throw new Error("Language index out of range");
  }

  const updated = { ...current[index], ...patch };
  const next = [...current];
  next[index] = normalizeLanguages([updated])[0] ?? current[index];

  await prisma.candidateProfile.upsert({
    where: { candidate_id: candidateId },
    update: { languages: JSON.stringify(next), updated_at: new Date() },
    create: { candidate_id: candidateId, languages: JSON.stringify(next) },
  });

  const { calculateProfileCompleteness } = await import("./candidate.service");
  await calculateProfileCompleteness(candidateId);

  return {
    success: true,
    message: `Successfully updated language #${index + 1}`,
    languages_count: next.length,
    languages: next,
  };
}
const cleanStr = (v?: string | null) => String(v ?? "").trim();

const normalizePlatform = (p?: string) => cleanStr(p).toLowerCase() || "other";

const canonicalizeUrl = (u?: string) => cleanStr(u).replace(/\/+$/g, "");

function normalizeLinks(raw: any[]): SocialLink[] {
  const arr = Array.isArray(raw) ? raw : [];
  const normalized = arr
    .map((x) => ({
      platform: normalizePlatform(x?.platform) as any,
      url: canonicalizeUrl(x?.url),
      display_name: cleanStr(x?.display_name),
    }))
    .filter((x) => !!x.url);

  const seen = new Set<string>();
  return normalized.filter((x) => {
    const key = `${x.platform}::${x.url.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
