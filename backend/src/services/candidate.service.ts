// UPDATED: CV Upload now uses LOCAL STORAGE instead of Cloudinary

import { PrismaClient } from "@prisma/client";
import path from 'path';
import {
  generateJobMatchReasoning,
} from "../lib/openai";
import {
  findSimilarJobs,
} from "../lib/pinecone";
import {
  CVUploadResponse,
  JobRecommendation,
  ProfileCompletenessScore,
  CandidateProfileSummary,
  CandidateServiceError,
  ProfilePictureUploadResult,
  APIResponse,
  UpdateLocationInput,
  UpdateSalaryInput,
  UpdateHeadlineInput, 
  HeadlineUpdateResult
} from "../types/candidate.types";
import { generateToken } from "../utils/jwt.util";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

import { processDocumentAsync } from "./candidate/documentProcessor.service";
import { cleanupOldResume, cleanupTempFile, cleanupOldProfilePicture } from "./candidate/cleanup.service";

import { triggerCandidateMatching } from "./matching/candidate-outbox.service";
import { completenessService } from "../../src/services/candidate/profile/completeness.service";
import { badgeService } from "../../src/services/candidate/profile/badge.service";

const prisma = new PrismaClient();
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

// ==================== CV UPLOAD - NOW USES LOCAL STORAGE ====================
export const uploadAndProcessCV = async (
  candidateId: string,
  file: Express.Multer.File
): Promise<CVUploadResponse> => {
  let tempFilePath: string | null = null;

  try {
    if (!file) {
      throw new Error("No file provided");
    }

    if (!fs.existsSync(file.path)) {
      throw new Error("File not found after upload");
    }

    tempFilePath = file.path;

    // Delete old CV if exists
    //await cleanupOldResume(candidateId);

    // Create upload directory for CVs
    const uploadDir = path.join(process.cwd(), 'uploads', 'resumes', 'cv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created directory: ${uploadDir}`);
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `cv_${candidateId}_${Date.now()}${fileExtension}`;
    const destinationPath = path.join(uploadDir, filename);

    // Move file from temp to permanent location
    fs.renameSync(tempFilePath, destinationPath);
    console.log(`✅ CV saved to: ${destinationPath}`);

    // Generate URL for access
    const fileUrl = `/uploads/resumes/cv/${filename}`;
    const fullUrl = `${process.env.APP_URL || 'http://localhost:5000'}${fileUrl}`;

    // Create document record with full URL
    const document = await prisma.candidateDocument.create({
      data: {
        candidate_id: candidateId,
        file_name: file.originalname,
        file_path: fullUrl, // Store full URL for easy access
        file_type: file.mimetype,
        file_size: file.size,
        upload_status: "uploaded",
        extraction_status: "pending",
      },
    });

// Kick off extraction in background + trigger matching after success
setImmediate(() => {
  processDocumentAsync(document.document_id, candidateId, destinationPath)
    .then(() => triggerCandidateMatching(candidateId, "cv_extracted"))
    .catch((e) => console.error("Failed to process document or trigger matching:", e));
});

    console.log(`✅ CV uploaded successfully for candidate: ${candidateId}`);

    return {
      success: true,
      document_id: document.document_id,
      document: {
        name: document.file_name,
        upload_status: document.upload_status,
        extraction_status: document.extraction_status,
        candidate_id: candidateId,
        whole_document: undefined,
      },
      message: "CV uploaded successfully. Processing in background.",
    };
  } catch (error) {
    console.error("❌ Error uploading CV:", error);
    
    // Cleanup temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      cleanupTempFile(tempFilePath);
    }
    
    throw error;
  }
};

// ==================== REST OF THE FILE REMAINS THE SAME ====================

export const getResumeDownloadUrl = async (
  candidateId: string
): Promise<APIResponse<{ download_url: string; file_name: string }>> => {
  try {
    const document = await prisma.candidateDocument.findFirst({
      where: { candidate_id: candidateId },
      orderBy: { created_at: "desc" },
    });

    if (!document) {
      return {
        success: false,
        message: "No resume found for this candidate",
      };
    }

    return {
      success: true,
      data: {
        download_url: document.file_path,
        file_name: document.file_name,
      },
      message: "Resume download URL retrieved successfully",
    };
  } catch (error) {
    console.error("Error getting resume download URL:", error);
    return {
      success: false,
      message: "Failed to get resume download URL",
    };
  }
};

export const deleteResume = async (
  candidateId: string
): Promise<APIResponse<{}>> => {
  try {
    const hasResume = await prisma.candidateDocument.findFirst({
      where: { candidate_id: candidateId },
    });

    if (!hasResume) {
      return {
        success: false,
        message: "No resume found to delete",
      };
    }

    await cleanupOldResume(candidateId);
    
    await completenessService.calculateCompleteness(candidateId);
    await badgeService.evaluateBadges(candidateId);

    
    return {
      success: true,
      data: {},
      message: "Resume and all related data deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting resume:", error);
    return {
      success: false,
      message: "Failed to delete resume",
    };
  }
};

export const hasExistingResume = async (candidateId: string): Promise<boolean> => {
  try {
    const count = await prisma.candidateDocument.count({
      where: { candidate_id: candidateId },
    });
    return count > 0;
  } catch (error) {
    console.error("Error checking existing resume:", error);
    return false;
  }
};

export const calculateProfileCompleteness = async (candidateId: string) => {
  return completenessService.calculateCompleteness(candidateId);
};


export const getProfileSummary = async (candidateId: string): Promise<CandidateProfileSummary> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: {
          orderBy: [
            { is_verified: 'desc' },
            { created_at: 'desc' }
          ]
        },
        candidateDocuments: {
          orderBy: { created_at: 'desc' }
        },
        profileCompleteness: true,
        careerPredictions: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const basicInfo = {
      name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone_number || undefined,
      headline: candidate.candidateProfile?.headline || undefined,
      about_me: candidate.candidateProfile?.about_me || undefined,
      city: candidate.candidateProfile?.city || undefined,
      location: candidate.candidateProfile?.location || undefined
    };

    const skills = candidate.candidateSkills.map(skill => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      skill_category: skill.skill_category || undefined,
      proficiency: skill.proficiency || undefined,
      years_experience: skill.years_experience || undefined,
      confidence_score: skill.confidence_score || undefined,
      source_type: skill.source_type,
      is_verified: skill.is_verified
    }));

    const documents = candidate.candidateDocuments.map(doc => ({
      id: doc.document_id,
      name: doc.file_name,
      upload_status: doc.upload_status,
      extraction_status: doc.extraction_status || undefined
    }));

    let profileCompleteness: ProfileCompletenessScore | undefined;

    // I changed this "if" because it generates errors 
if (candidate.profileCompleteness && candidate.profileCompleteness.length > 0) {
  // take latest one (your query should already order + take 1, but this is safe)
  const pc = candidate.profileCompleteness[0];

  profileCompleteness = {
    overall_score: pc.overall_score,
    basic_info_score: pc.basic_info_score,
    skills_score: pc.skills_score,
    experience_score: pc.experience_score,
    profile_picture_score: pc.profile_picture_score,
    education_score: pc.education_score,
    document_score: pc.document_score,
    headline_score: pc.headline_score,

    // Json fields in Prisma are already objects/arrays (not strings)
    missing_fields: Array.isArray(pc.missing_fields)
      ? (pc.missing_fields as string[])
      : [],
    suggestions: Array.isArray(pc.suggestions)
      ? (pc.suggestions as string[])
      : [],
  };
}


    const summary: CandidateProfileSummary = {
      basic_info: basicInfo,
      skills, 
      documents,
      profile_completeness: profileCompleteness,
      
      career_prediction: candidate.careerPredictions[0] ? {
        current_role: candidate.careerPredictions[0].current_role || '',
        predicted_roles: JSON.parse(candidate.careerPredictions[0].predicted_roles as string),
        career_path: JSON.parse(candidate.careerPredictions[0].career_path as string),
        skill_gaps: JSON.parse(candidate.careerPredictions[0].skill_gaps as string),
        salary_prediction: JSON.parse(candidate.careerPredictions[0].salary_prediction as string),
        confidence_score: candidate.careerPredictions[0].confidence_score
      } : undefined
    };

    return summary;
  } catch (error) {
    console.error('Error getting profile summary:', error);
    throw new Error('Failed to get profile summary');
  }
};

export const updateCandidateHeadline = async (
  candidateId: string,
  data: UpdateHeadlineInput
): Promise<HeadlineUpdateResult> => {
  try {
    if (!data.headline || data.headline.trim().length === 0) {
      throw new Error("Headline is required");
    }

    if (data.headline.length > 120) {
      throw new Error("Headline cannot exceed 120 characters");
    }

    const updatedProfile = await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        headline: data.headline.trim(),
        updated_at: new Date(),
      },
      create: {
        candidate_id: candidateId,
        headline: data.headline.trim(),
      },
    });

    completenessService.calculateCompleteness(candidateId)
      .then(() => badgeService.evaluateBadges(candidateId))
      .catch((error) => console.warn("Failed to recalc/evaluate badges:", error));

    await triggerCandidateMatching(candidateId, "updateHeadline").catch(e =>
      console.warn("Failed to trigger matching:", e)
    );
    return {
      success: true,
      headline: updatedProfile.headline || data.headline,
      message: "Headline updated successfully",
    };
  } catch (error) {
    console.error("Error updating candidate headline:", error);
    throw new Error(
      `Failed to update headline: ${error.message || "Unknown error"}`
    );
  }
};

export async function updateCandidateLocation(
  userId: string,
  data: UpdateLocationInput
) {
  try {
    const result = await prisma.candidateProfile.upsert({
      where: { candidate_id: userId },
      update: {
        location: data.location,
        postal_code: data.postalCode,
      },
      create: {
        candidate_id: userId,
        location: data.location,
        postal_code: data.postalCode,
      },
    });

    return result;
  } catch (error) {
    console.error("Error updating candidate location:", error);
    throw new Error(
      `Failed to update candidate location: ${error.message || "Unknown error"}`
    );
  }
}

export async function updateCandidateSalary(
  userId: string,
  data: UpdateSalaryInput
) {
  try {
    const result = await prisma.candidateProfile.upsert({
      where: { candidate_id: userId },
      update: {
        minimum_salary_amount: data.minimumSalary,
        payment_period: data.paymentPeriod,
      },
      create: {
        candidate_id: userId,
        minimum_salary_amount: data.minimumSalary,
        payment_period: data.paymentPeriod,
      },
    });

    return result;
  } catch (error) {
    console.error("Error updating candidate salary:", error);
    throw new Error(
      `Failed to update candidate salary: ${error.message || "Unknown error"}`
    );
  }
}

export const uploadProfilePicture = async (
  candidateId: string,
  file: Express.Multer.File
): Promise<ProfilePictureUploadResult> => {
  let tempFilePath: string | null = null;

  try {
    if (!candidateId) {
      throw new Error("Candidate ID is required");
    }

    if (!file || !fs.existsSync(file.path)) {
      throw new Error("File not found after upload");
    }

    tempFilePath = file.path;

    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
      select: { profile_picture_url: true },
    });

    const oldPictureUrl = existingProfile?.profile_picture_url;

    const cloudinaryResult = await cloudinary.uploader.upload(tempFilePath, {
      folder: "hiralent/profile-pictures",
      public_id: `candidate_${candidateId}_${Date.now()}`,
      transformation: [
        {
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "face",
          quality: "auto:good",
          format: "webp",
        },
      ],
      resource_type: "image",
    });

    const updatedProfile = await prisma.candidateProfile.upsert({
      where: { candidate_id: candidateId },
      update: {
        profile_picture_url: cloudinaryResult.secure_url,
        updated_at: new Date(),
      },
      create: {
        candidate_id: candidateId,
        profile_picture_url: cloudinaryResult.secure_url,
      },
    });

    cleanupTempFile(tempFilePath);

    if (oldPictureUrl && oldPictureUrl !== cloudinaryResult.secure_url) {
      await cleanupOldProfilePicture(candidateId, oldPictureUrl);
    }

    completenessService.calculateCompleteness(candidateId)
      .then(() => badgeService.evaluateBadges(candidateId))
      .catch((error) => console.warn("Failed to recalc/evaluate badges:", error));


    return {
      success: true,
      profile_picture_url: cloudinaryResult.secure_url,
      old_picture_url: oldPictureUrl || undefined,
      message: "Profile picture uploaded and optimized successfully",
    };
  } catch (error) {
    console.error("Service error - Profile picture upload:", error);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      cleanupTempFile(tempFilePath);
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Profile picture upload failed: ${errorMessage}`);
  }
};

export const getCandidateProfile = async (candidateId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: {
          orderBy: [
            { is_verified: 'desc' },
            { created_at: 'desc' }
          ]
        },
        agency: {
          select: {
            agency_id: true,
            name: true,
            website: true,
            logo_url: true,
            status: true
          }
        }
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const cleanUser = {
      user_id: user.user_id,
      email: user.email,
      is_email_verified: user.is_email_verified,
      full_name: user.full_name,
      role: user.role,
      phone_number: user.phone_number,
      position: user.position,
      linkedin_url: user.linkedin_url,
      agency_id: user.agency_id,
      agency: user.agency,
    };

    const populatedSkills = user.candidateSkills.map(skill => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      skill_category: skill.skill_category,
      proficiency: skill.proficiency,
      years_experience: skill.years_experience,
      confidence_score: skill.confidence_score,
      source_type: skill.source_type,
      is_verified: skill.is_verified
    }));

    let profileData = null;
    if (user.candidateProfile) {
      profileData = {
        ...user.candidateProfile,
        created_at: user.candidateProfile.created_at.toISOString(),
        updated_at: user.candidateProfile.updated_at.toISOString(),
        skills: populatedSkills
      };
    } else {
      profileData = {
        candidate_id: candidateId,
        about_me: null,
        city: null,
        created_at: new Date().toISOString(),
        education: null,
        experience: null,
        headline: null,
        job_benefits: null,
        languages: null,
        links: null,
        location: null,
        minimum_salary_amount: null,
        payment_period: null,
        postal_code: null,
        preferred_locations: null,
        profile_picture_url: null,
        resume_url: null,
        skills: populatedSkills,
        updated_at: new Date().toISOString(),
        video_intro_url: null,
      };
    }

    return {
      user: cleanUser,
      profile: profileData,
    };
  } catch (error) {
    console.error("Error getting candidate profile:", error);
    const serviceError: CandidateServiceError = new Error(
      "Failed to get candidate profile"
    );
    serviceError.code = "PROFILE_FETCH_FAILED";
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

export const getPublicProfile = async (candidateId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        user_id: candidateId,
        role: "candidate",
      },
      select: {
        full_name: true,
        position: true,
        linkedin_url: true,

        candidateProfile: {
          select: {
            profile_picture_url: true,
            headline: true,
            about_me: true,
            location: true,
            city: true,
            languages: true,
            video_intro_url: true,
            links: true,
            resume_application_url: true,
            experience: true,
            education: true,
          },
        },

        // keep your verified skills filter if you want
        candidateSkills: {
          select: {
            skill_name: true,
            skill_category: true,
            proficiency: true,
            years_experience: true,
            is_verified: true,
          },
          where: { is_verified: true },
        },

        // ✅ ADD THIS
        profileCompleteness: {
          select: {
            overall_score: true,
            last_calculated: true,
          },
        },
      },
    });

    if (!user) throw new Error("Candidate profile not found");

    return {
      full_name: user.full_name,
      position: user.position,
      linkedin_url: user.linkedin_url,

      profile_picture_url: user.candidateProfile?.profile_picture_url || null,
      headline: user.candidateProfile?.headline || null,
      about_me: user.candidateProfile?.about_me || null,
      location: user.candidateProfile?.location || null,
      city: user.candidateProfile?.city || null,
      languages: user.candidateProfile?.languages || null,
      video_intro_url: user.candidateProfile?.video_intro_url || null,
      links: user.candidateProfile?.links || null,
      resume_application_url: user.candidateProfile?.resume_application_url || null,
      experience: user.candidateProfile?.experience || null,
      education: user.candidateProfile?.education || null,
      skills: user.candidateSkills || [],

      // ✅ NEW: what the frontend will read
      completion_score: user.profileCompleteness?.overall_score ?? null,
      completeness_last_calculated: user.profileCompleteness?.last_calculated ?? null,
    };
  } catch (error) {
    console.error("Error fetching public profile:", error);
    throw error;
  }
};
