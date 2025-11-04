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
import { generateToken } from "../utils/jwt.util";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

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
    if (!file) {
      throw new Error("No file provided");
    }

    if (!fs.existsSync(file.path)) {
      throw new Error("File not found after upload");
    }

    await cleanupOldResume(candidateId);

    const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
      folder: "hiralent-candidate/resumes",
      public_id: `resume_${candidateId}_${Date.now()}`,
      resource_type: "raw",
      access_mode: 'public',
      type: 'upload'
    });

    const document = await prisma.candidateDocument.create({
      data: {
        candidate_id: candidateId,
        file_name: file.originalname,
        file_path: cloudinaryResult.secure_url,
        file_type: file.mimetype,
        file_size: file.size,
        upload_status: "uploaded",
        extraction_status: "pending",
      },
    });

    cleanupTempFile(file.path);

    processDocumentAsync(document.document_id, candidateId, cloudinaryResult.secure_url);

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
    const candidateVector = await prisma.candidateVector.findUnique({
      where: { candidate_id: candidateId },
    });

    if (!candidateVector) {
      throw new Error("Candidate vector not found. Please upload CV first.");
    }

    const combinedVector = candidateVector.combined_vector as number[];

    const similarJobs = await findSimilarJobs(combinedVector, limit);

    const candidateSkills = await prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId },
    });

    const recommendations: JobRecommendation[] = [];
    for (const match of similarJobs) {
      const jobId = match.metadata?.job_id;
      if (!jobId) continue;

      const job = await prisma.companyJob.findUnique({
        where: { job_id: jobId },
        include: {
          company: { select: { full_name: true } },
          agency: { select: { name: true } },
        },
      });

      if (!job) continue;

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
        company: job.company.full_name,
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

export const calculateProfileCompleteness = async (candidateId: string): Promise<ProfileCompletenessScore> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
        candidateDocuments: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const profile = candidate.candidateProfile;
    let totalScore = 0;
    const maxScore = 100;
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    let basicInfoScore = 0;
    if (candidate.full_name?.trim()) basicInfoScore += 8;
    else missingFields.push('full_name');
    
    if (candidate.email?.trim()) basicInfoScore += 5;
    
    if (candidate.phone_number?.trim()) basicInfoScore += 4;
    else missingFields.push('phone_number');
    
    if (profile?.location?.trim()) basicInfoScore += 4;
    else missingFields.push('location');
    
    if (profile?.about_me?.trim()) basicInfoScore += 4;
    else missingFields.push('about_me');

    totalScore += basicInfoScore;

    let headlineScore = 0;
    if (profile?.headline?.trim()) {
      headlineScore = 10;
    } else {
      missingFields.push('headline');
      suggestions.push('Add a professional headline to attract employers');
    }
    totalScore += headlineScore;

    let skillsScore = 0;
    const skillsCount = candidate.candidateSkills.length;
    
    if (skillsCount > 0) {
      if (skillsCount >= 8) skillsScore = 25;
      else if (skillsCount >= 5) skillsScore = 20;
      else if (skillsCount >= 3) skillsScore = 15;
      else skillsScore = 10;
    } else {
      missingFields.push('skills');
      suggestions.push('Add at least 5 relevant skills to improve your profile');
    }
    totalScore += skillsScore;

    let experienceScore = 0;
    if (profile?.experience) {
      try {
        const experiences = JSON.parse(profile.experience);
        if (Array.isArray(experiences) && experiences.length > 0) {
          if (experiences.length >= 3) experienceScore = 20;
          else if (experiences.length >= 2) experienceScore = 15;
          else experienceScore = 10;
        }
      } catch (e) {
      }
    }
    if (experienceScore === 0) {
      missingFields.push('experience');
      suggestions.push('Add your work experience to show your background');
    }
    totalScore += experienceScore;

    let educationScore = 0;
    if (profile?.education) {
      try {
        const education = JSON.parse(profile.education);
        if (Array.isArray(education) && education.length > 0) {
          educationScore = 10;
        }
      } catch (e) {
      }
    }
    if (educationScore === 0) {
      missingFields.push('education');
      suggestions.push('Add your educational background');
    }
    totalScore += educationScore;

    let profilePictureScore = 0;
    if (profile?.profile_picture_url?.trim()) {
      profilePictureScore = 5;
    } else {
      missingFields.push('profile_picture');
      suggestions.push('Add a professional profile picture');
    }
    totalScore += profilePictureScore;

    let documentScore = 0;
    const hasResume = candidate.candidateDocuments.some(doc => 
      doc.upload_status === 'completed' && doc.extraction_status === 'completed'
    );
    if (hasResume) {
      documentScore = 5;
    } else {
      missingFields.push('resume_document');
      suggestions.push('Upload your resume for better profile analysis');
    }
    totalScore += documentScore;

    const completenessData = {
      overall_score: Math.round((totalScore / maxScore) * 100),
      basic_info_score: Math.round((basicInfoScore / 25) * 100),
      headline_score: Math.round((headlineScore / 10) * 100),
      skills_score: Math.round((skillsScore / 25) * 100),
      experience_score: Math.round((experienceScore / 20) * 100),
      education_score: Math.round((educationScore / 10) * 100),
      profile_picture_score: Math.round((profilePictureScore / 5) * 100),
      document_score: Math.round((documentScore / 5) * 100),
      missing_fields: missingFields,
      suggestions: suggestions
    };

    await prisma.profileCompleteness.upsert({
      where: { candidate_id: candidateId },
      update: {
        ...completenessData,
        last_calculated: new Date()
      },
      create: {
        candidate_id: candidateId,
        ...completenessData,
        last_calculated: new Date()
      }
    });

    return completenessData;

  } catch (error) {
    console.error('Error calculating profile completeness:', error);
    throw new Error('Failed to calculate profile completeness');
  }
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
    if (candidate.profileCompleteness) {
      profileCompleteness = {
        overall_score: candidate.profileCompleteness.overall_score,
        basic_info_score: candidate.profileCompleteness.basic_info_score,
        skills_score: candidate.profileCompleteness.skills_score,
        experience_score: candidate.profileCompleteness.experience_score,
        profile_picture_score: candidate.profileCompleteness.profile_picture_score,
        education_score: candidate.profileCompleteness.education_score,
        document_score: candidate.profileCompleteness.document_score,
        headline_score: candidate.profileCompleteness.headline_score,
        missing_fields: Array.isArray(candidate.profileCompleteness.missing_fields) 
          ? candidate.profileCompleteness.missing_fields as string[]
          : JSON.parse(candidate.profileCompleteness.missing_fields as string),
        suggestions: Array.isArray(candidate.profileCompleteness.suggestions)
          ? candidate.profileCompleteness.suggestions as string[]
          : JSON.parse(candidate.profileCompleteness.suggestions as string)
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
        role: 'candidate' 
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
          }
        },
        candidateSkills: {
          select: {
            skill_name: true,
            skill_category: true,
            proficiency: true,
            years_experience: true,
            is_verified: true,
          },
          where: {
            is_verified: true 
          }
        }
      }
    });

    if (!user) {
      throw new Error('Candidate profile not found');
    }

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
      skills: user.candidateSkills || [],
      experience: user.candidateProfile?.experience || null,
      education: user.candidateProfile?.education || null,
    };
  } catch (error) {
    console.error('Error fetching public profile:', error);
    throw error;
  }
};
