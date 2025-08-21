import { PrismaClient } from "@prisma/client";
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
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// Import our separated services
import { processDocumentAsync } from "./candidate/documentProcessor.service";
import { cleanupOldResume, cleanupTempFile, cleanupOldProfilePicture } from "./candidate/cleanup.service";

const prisma = new PrismaClient();
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});


export const uploadAndProcessCV = async (
  candidateId: string,
  file: Express.Multer.File
): Promise<CVUploadResponse> => {
  try {
    // Check if file exists
    if (!file) {
      throw new Error("No file provided");
    }

    if (!fs.existsSync(file.path)) {
      throw new Error("File not found after upload");
    }

    // Step 1: Clean up old resume and related data
    await cleanupOldResume(candidateId);

    // Step 2: Upload to Cloudinary
    console.log("Uploading resume to Cloudinary...");
    const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
      folder: "hiralent-candidate/resumes",
      public_id: `resume_${candidateId}_${Date.now()}`,
      resource_type: "raw", // Changed from "auto" to "raw" for better PDF handling
      access_mode: 'public',
      type: 'upload' // Removed access_control array
    });

    console.log("Cloudinary upload successful:", cloudinaryResult.secure_url);

    // Step 3: Create new document record with direct Cloudinary URL
    const document = await prisma.candidateDocument.create({
      data: {
        candidate_id: candidateId,
        file_name: file.originalname,
        file_path: cloudinaryResult.secure_url, // Use direct secure_url instead of complex URL generation
        file_type: file.mimetype,
        file_size: file.size,
        upload_status: "uploaded",
        extraction_status: "pending",
      },
    });

    // Step 4: Clean up temporary local file
    cleanupTempFile(file.path);

    // Step 5: Start background processing using separated service
    processDocumentAsync(document.document_id, candidateId, cloudinaryResult.secure_url);

    // Step 6: Return response with download URL
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
      message: "CV uploaded successfully to Cloudinary. Processing in background.",
    };
  } catch (error) {
    console.error("Error uploading CV:", error);
    
    // Clean up temporary file on error
    if (file && fs.existsSync(file.path)) {
      cleanupTempFile(file.path);
    }
    
    throw error;
  }
};

export const getResumeDownloadUrl = async (
  candidateId: string
): Promise<APIResponse<{ download_url: string; file_name: string }>> => {
  try {
    const document = await prisma.candidateDocument.findFirst({
      where: { candidate_id: candidateId },
      orderBy: { created_at: "desc" }, // Get latest resume
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
        download_url: document.file_path, // This is now Cloudinary URL
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

    // Use cleanup function to remove everything
    await cleanupOldResume(candidateId);
    
    // Recalculate profile completeness after deletion
    await calculateProfileCompleteness(candidateId);
    
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

export const getJobRecommendations = async (
  candidateId: string,
  limit: number = 20
): Promise<JobRecommendation[]> => {
  try {
    // Get candidate vector
    const candidateVector = await prisma.candidateVector.findUnique({
      where: { candidate_id: candidateId },
    });

    if (!candidateVector) {
      throw new Error("Candidate vector not found. Please upload CV first.");
    }

    const combinedVector = candidateVector.combined_vector as number[];

    // Find similar jobs using Pinecone
    const similarJobs = await findSimilarJobs(combinedVector, limit);

    // Get candidate skills for detailed matching
    const candidateSkills = await prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId },
    });

    // Process each job recommendation
    const recommendations: JobRecommendation[] = [];
    for (const match of similarJobs) {
      const jobId = match.metadata?.job_id;
      if (!jobId) continue;

      // Get job details - Updated to use CompanyJob
      const job = await prisma.companyJob.findUnique({
        where: { job_id: jobId },
        include: {
          company: { select: { full_name: true } },  // Updated from 'recruiter' to 'company'
          agency: { select: { name: true } },
        },
      });

      if (!job) continue;

      // Generate detailed match reasoning
      const jobRequirements = {
        title: job.title,
        required_skills: job.required_skills,
        description: job.description,
        location: job.location,
      };

      const matchReasoning = await generateJobMatchReasoning(
        candidateSkills,
        jobRequirements
      );

      // Save recommendation
      const existing = await prisma.jobRecommendation.findFirst({
        where: {
          candidate_id: candidateId,
          job_id: jobId,
        },
      });

      if (!existing) {
        await prisma.jobRecommendation.create({
          data: {
            candidate_id: candidateId,
            job_id: jobId,
            match_score: match.score || 0,
            skill_match: JSON.stringify(matchReasoning),
            ai_reasoning: matchReasoning.reasoning,
          },
        });
      }

      recommendations.push({
        job_id: jobId,
        title: job.title,
        company: job.company.full_name,  // Updated to use company relation
        location: job.location,
        salary_range: job.salary_range || undefined,
        match_score: match.score || 0,
        match_reasoning: matchReasoning,
        created_at: job.created_at,
      });
    }

    return recommendations;
  } catch (error) {
    console.error("Error getting job recommendations:", error);
    const serviceError: CandidateServiceError = new Error(
      "Failed to get job recommendations"
    );
    serviceError.code = "RECOMMENDATIONS_FAILED";
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

export const calculateProfileCompleteness = async (
  candidateId: string
): Promise<ProfileCompletenessScore> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
        candidateDocuments: true,
      },
    });

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    let totalScore = 0;
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    // Basic info score (20 points)
    let basicInfoScore = 0;
    if (candidate.full_name) basicInfoScore += 5;
    if (candidate.email) basicInfoScore += 5;
    if (candidate.phone_number) basicInfoScore += 5;
    if (candidate.candidateProfile?.resume_url) basicInfoScore += 5;
    totalScore += basicInfoScore;

    if (!candidate.phone_number) {
      missingFields.push("phone_number");
      suggestions.push("Add your phone number for better contact");
    }

    // Profile picture score (5 points)
    let profilePictureScore = 0;
    if (candidate.candidateProfile?.profile_picture_url) {
      profilePictureScore = 5;
    }
    totalScore += profilePictureScore;

    if (!candidate.candidateProfile?.profile_picture_url) {
      missingFields.push("profile_picture");
      suggestions.push("Add a profile picture to personalize your profile");
    }

    // NEW: Headline score (3 points)
    let headlineScore = 0;
    if (candidate.candidateProfile?.headline) {
      headlineScore = 3;
    }
    totalScore += headlineScore;

    if (!candidate.candidateProfile?.headline) {
      missingFields.push("headline");
      suggestions.push("Add a professional headline to your profile");
    }

    // Skills score (25 points)
    const skillsCount = candidate.candidateSkills.length;
    const skillsScore = Math.min(25, skillsCount * 2.5);
    totalScore += skillsScore;

    if (skillsCount < 10) {
      missingFields.push("skills");
      suggestions.push("Add more skills to improve your profile");
    }

    // Experience score (22 points) - Reduced from 25 to accommodate headline
    let experienceScore = 0;
    try {
      const experience = candidate.candidateProfile?.experience
        ? JSON.parse(candidate.candidateProfile.experience)
        : [];
      experienceScore = Math.min(22, experience.length * 7.33);
    } catch (e) {
      experienceScore = 0;
    }
    totalScore += experienceScore;

    if (experienceScore < 15) {
      missingFields.push("experience");
      suggestions.push("Add more work experience details");
    }

    // Education score (15 points)
    let educationScore = 0;
    try {
      const education = candidate.candidateProfile?.education
        ? JSON.parse(candidate.candidateProfile.education)
        : [];
      educationScore = Math.min(15, education.length * 7.5);
    } catch (e) {
      educationScore = 0;
    }
    totalScore += educationScore;

    if (educationScore < 10) {
      missingFields.push("education");
      suggestions.push("Add your educational background");
    }

    // Document score (10 points)
    const documentScore = candidate.candidateDocuments.length > 0 ? 10 : 0;
    totalScore += documentScore;

    if (documentScore === 0) {
      missingFields.push("cv_document");
      suggestions.push("Upload your CV/Resume");
    }

    // Save completeness data with headline score
    const completenessData: ProfileCompletenessScore = {
      overall_score: Math.round(totalScore),
      basic_info_score: basicInfoScore,
      skills_score: skillsScore,
      experience_score: experienceScore,
      education_score: educationScore,
      document_score: documentScore,
      profile_picture_score: profilePictureScore,
      headline_score: headlineScore, // NEW FIELD
      missing_fields: missingFields,
      suggestions: suggestions,
    };

    const existing = await prisma.profileCompleteness.findUnique({
      where: { candidate_id: candidateId },
    });

    if (existing) {
      await prisma.profileCompleteness.update({
        where: { candidate_id: candidateId },
        data: completenessData,
      });
    } else {
      await prisma.profileCompleteness.create({
        data: {
          candidate_id: candidateId,
          ...completenessData,
        },
      });
    }

    return completenessData;
  } catch (error) {
    console.error("Error calculating profile completeness:", error);
    const serviceError: CandidateServiceError = new Error(
      "Failed to calculate profile completeness"
    );
    serviceError.code = "COMPLETENESS_CALCULATION_FAILED";
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

export const getProfileSummary = async (
  candidateId: string
): Promise<CandidateProfileSummary> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
        candidateDocuments: true,
        careerPredictions: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
        profileCompleteness: true,
      },
    });

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    return {
      basic_info: {
        name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone_number || undefined,
        headline: candidate.candidateProfile?.headline || undefined, // NEW FIELD
      },
      skills: candidate.candidateSkills,
      profile_completeness: candidate.profileCompleteness
        ? {
            overall_score: candidate.profileCompleteness.overall_score,
            basic_info_score: candidate.profileCompleteness.basic_info_score,
            skills_score: candidate.profileCompleteness.skills_score,
            experience_score: candidate.profileCompleteness.experience_score,
            education_score: candidate.profileCompleteness.education_score,
            document_score: candidate.profileCompleteness.document_score,
            profile_picture_score: candidate.profileCompleteness.profile_picture_score,
            headline_score: candidate.profileCompleteness.headline_score, // NEW FIELD
            missing_fields: candidate.profileCompleteness.missing_fields as string[],
            suggestions: candidate.profileCompleteness.suggestions as string[],
          }
        : undefined,
      career_prediction: candidate.careerPredictions[0]
        ? {
            current_role: candidate.careerPredictions[0].current_role || "",
            predicted_roles: JSON.parse(
              candidate.careerPredictions[0].predicted_roles as string
            ),
            career_path: JSON.parse(
              candidate.careerPredictions[0].career_path as string
            ),
            skill_gaps: JSON.parse(
              candidate.careerPredictions[0].skill_gaps as string
            ),
            salary_prediction: JSON.parse(
              candidate.careerPredictions[0].salary_prediction as string
            ),
            confidence_score: candidate.careerPredictions[0].confidence_score,
          }
        : undefined,
      documents: candidate.candidateDocuments.map((doc) => ({
        id: doc.document_id,
        name: doc.file_name,
        upload_status: doc.upload_status,
        extraction_status: doc.extraction_status || undefined,
      })),
    };
  } catch (error) {
    console.error("Error getting profile summary:", error);
    const serviceError: CandidateServiceError = new Error(
      "Failed to get profile summary"
    );
    serviceError.code = "PROFILE_SUMMARY_FAILED";
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

export const updateCandidateHeadline = async (
  candidateId: string,
  data: UpdateHeadlineInput
): Promise<HeadlineUpdateResult> => {
  try {
    // Validate headline length
    if (!data.headline || data.headline.trim().length === 0) {
      throw new Error("Headline is required");
    }

    if (data.headline.length > 120) {
      throw new Error("Headline cannot exceed 120 characters");
    }

    // Update headline in database
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

    // Recalculate profile completeness (async, don't wait)
    calculateProfileCompleteness(candidateId).catch((error) => {
      console.warn("Failed to recalculate profile completeness:", error);
    });

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
    console.log("📛 userId in updateCandidateLocation: ", userId);

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
    // Validate inputs
    if (!candidateId) {
      throw new Error("Candidate ID is required");
    }

    if (!file || !fs.existsSync(file.path)) {
      throw new Error("File not found after upload");
    }

    tempFilePath = file.path;
    console.log(
      `Processing profile picture upload for candidate: ${candidateId}`
    );
    console.log(`File path: ${tempFilePath}`);

    // Get existing profile to check for old picture
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
      select: { profile_picture_url: true },
    });

    const oldPictureUrl = existingProfile?.profile_picture_url;

    // Upload to Cloudinary with optimizations
    console.log("Uploading to Cloudinary...");
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
          format: "webp", // Convert to WebP for better compression
        },
      ],
      resource_type: "image",
    });

    console.log("Cloudinary upload successful:", cloudinaryResult.secure_url);

    // Update database with new profile picture URL
    console.log("Updating database...");
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

    console.log("Database updated successfully");

    // Clean up temporary file
    cleanupTempFile(tempFilePath);

    // Delete old Cloudinary image if exists (using separated service)
    if (oldPictureUrl && oldPictureUrl !== cloudinaryResult.secure_url) {
      await cleanupOldProfilePicture(candidateId, oldPictureUrl);
    }

    // Recalculate profile completeness (async, don't wait)
    calculateProfileCompleteness(candidateId).catch((error) => {
      console.warn("Failed to recalculate profile completeness:", error);
    });

    return {
      success: true,
      profile_picture_url: cloudinaryResult.secure_url,
      old_picture_url: oldPictureUrl || undefined,
      message: "Profile picture uploaded and optimized successfully",
    };
  } catch (error) {
    console.error("Service error - Profile picture upload:", error);

    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      cleanupTempFile(tempFilePath);
    }

    // Re-throw with more context
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Profile picture upload failed: ${errorMessage}`);
  }
};