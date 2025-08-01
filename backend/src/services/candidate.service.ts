import { PrismaClient } from "@prisma/client";
import {
  extractSkillsFromText,
  predictCareerPath,
  createEmbedding,
  generateJobMatchReasoning,
} from "../lib/openai";
import {
  storeCandidateVector,
  findSimilarJobs,
  storeJobVector,
} from "../lib/pinecone";
import {
  parseDocument,
  preprocessText,
  extractContactInfo,
} from "../utils/documentParser.util";
import {
  CVUploadResponse,
  AIExtractionResult,
  CareerPredictionResult,
  JobRecommendation,
  ProfileCompletenessScore,
  CandidateProfileSummary,
  CandidateServiceError,
  ProfilePictureUploadResult,
} from "../types/candidate.types";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import {
  UpdateLocationInput,
  UpdateSalaryInput,
} from "../types/candidate.types";
const prisma = new PrismaClient();
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

// Upload and process CV
export const uploadAndProcessCV = async (
  candidateId: string,
  file: Express.Multer.File
): Promise<CVUploadResponse> => {
  try {
    // Check if file exists
    if (!file) {
      throw new Error("No file provided");
    }

    // Check if file path exists
    if (!fs.existsSync(file.path)) {
      throw new Error("File not found after upload");
    }

    const document = await prisma.candidateDocument.create({
      data: {
        candidate_id: candidateId,
        file_name: file.originalname,
        file_path: file.path,
        file_type: file.mimetype,
        file_size: file.size,
        upload_status: "uploaded",
        extraction_status: "pending",
      },
    });

    // Don't read file content immediately - let it process async
    processDocumentAsync(document.document_id, candidateId);

    return {
      success: true,
      document_id: document.document_id,
      document: {
        name: document.file_name,
        upload_status: document.upload_status,
        extraction_status: document.extraction_status,
        candidate_id: candidateId,
        // Remove this line - don't read file content here
        // whole_document: fs.readFileSync(document.file_path, 'utf-8')
      },
      message: "CV uploaded successfully. Processing in background.",
    };
  } catch (error) {
    console.error("Error uploading CV:", error);
    throw error;
  }
};

// Process document in background
const processDocumentAsync = async (
  documentId: string,
  candidateId: string
): Promise<void> => {
  try {
    // Update status to processing
    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: { extraction_status: "processing" },
    });

    // Get document info
    const document = await prisma.candidateDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Parse document text
    const parsedDoc = await parseDocument(
      document.file_path,
      document.file_type
    );
    const processedText = preprocessText(parsedDoc.text);
    console.log("Processed Text:", processedText);
    // Update document with extracted text
    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: {
        processed_text: processedText,
        extraction_status: "completed",
      },
    });

    // Create skill extraction record
    const skillExtraction = await prisma.skillExtraction.create({
      data: {
        document_id: documentId,
        candidate_id: candidateId,
        status: "processing",
        ai_provider: "openai",
      },
    });
    console.log("Skill Extraction Record:", skillExtraction);
    // Extract skills using AI
    const startTime = Date.now();
    const extractedData: AIExtractionResult = await extractSkillsFromText(
      processedText
    );
    const processingTime = Date.now() - startTime;

    // Update skill extraction record
    await prisma.skillExtraction.update({
      where: { extraction_id: skillExtraction.extraction_id },
      data: {
        status: "completed",
        raw_response: JSON.stringify(extractedData),
        extracted_skills: JSON.stringify(extractedData),
        processing_time: processingTime,
      },
    });

    // Save extracted skills
    if (extractedData.skills && Array.isArray(extractedData.skills)) {
      for (const skill of extractedData.skills) {
        await prisma.candidateSkill.create({
          data: {
            candidate_id: candidateId,
            skill_name: skill.name,
            skill_category: skill.category || "technical",
            proficiency: skill.proficiency || "intermediate",
            years_experience: skill.years_experience || 0,
            confidence_score: 0.8, // Default confidence
            source_type: "cv_extraction",
            source_document_id: documentId,
          },
        });
      }
    }
    console.log("Extracted Skills:", extractedData.skills);
    // Update candidate profile with extracted data
    await updateCandidateProfile(candidateId, extractedData);

    // Generate career prediction
    await generateCareerPrediction(candidateId);

    // Create/update candidate vector for job matching
    await updateCandidateVector(candidateId);

    // Calculate profile completeness
    await calculateProfileCompleteness(candidateId);
  } catch (error) {
    console.error("Error processing document:", error);

    // Update extraction status to failed
    await prisma.skillExtraction.updateMany({
      where: {
        document_id: documentId,
        status: "processing",
      },
      data: {
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
};

// Update candidate profile with extracted data
const updateCandidateProfile = async (
  candidateId: string,
  extractedData: AIExtractionResult
): Promise<void> => {
  try {
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
    });

    const profileData = {
      skills: JSON.stringify(extractedData.skills || []),
      education: JSON.stringify(extractedData.education || []),
      experience: JSON.stringify(extractedData.experience || []),
    };

    if (existingProfile) {
      await prisma.candidateProfile.update({
        where: { candidate_id: candidateId },
        data: profileData,
      });
    } else {
      await prisma.candidateProfile.create({
        data: {
          candidate_id: candidateId,
          ...profileData,
        },
      });
    }
  } catch (error) {
    console.error("Error updating candidate profile:", error);
  }
};

// Generate AI career prediction
export const generateCareerPrediction = async (
  candidateId: string
): Promise<CareerPredictionResult> => {
  try {
    // Get candidate data
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
      },
    });

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    // Prepare data for AI prediction
    const candidateData = {
      skills: candidate.candidateSkills.map((s) => ({
        name: s.skill_name,
        category:
          (s.skill_category as
            | "technical"
            | "soft"
            | "language"
            | "certification") || "technical",
        proficiency:
          (s.proficiency as
            | "beginner"
            | "intermediate"
            | "advanced"
            | "expert") || "intermediate",
        years_experience: s.years_experience || 0,
      })),
      education: candidate.candidateProfile?.education
        ? JSON.parse(candidate.candidateProfile.education)
        : [],
      experience: candidate.candidateProfile?.experience
        ? JSON.parse(candidate.candidateProfile.experience)
        : [],
    };

    // Generate prediction using AI
    const prediction: CareerPredictionResult = await predictCareerPath(
      candidateData
    );

    // Save prediction
    await prisma.careerPrediction.create({
      data: {
        candidate_id: candidateId,
        current_role: prediction.current_role,
        predicted_roles: JSON.stringify(prediction.predicted_roles),
        career_path: JSON.stringify(prediction.career_path),
        skill_gaps: JSON.stringify(prediction.skill_gaps),
        salary_prediction: JSON.stringify(prediction.salary_prediction),
        confidence_score: prediction.confidence_score || 0.7,
        ai_model_version: "gemini-0.5",
        input_data_summary: `Skills: ${candidateData.skills.length}, Experience: ${candidateData.experience.length}`,
      },
    });

    return prediction;
  } catch (error) {
    console.error("Error generating career prediction:", error);
    const serviceError: CandidateServiceError = new Error(
      "Failed to generate career prediction"
    );
    serviceError.code = "PREDICTION_FAILED";
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// Create/update candidate vector for job matching
export const updateCandidateVector = async (
  candidateId: string
): Promise<{ success: boolean }> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
      },
    });

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    // Create text representation for embedding
    const skillsText = candidate.candidateSkills
      .map((s) => `${s.skill_name} (${s.proficiency})`)
      .join(", ");

    const experienceText = candidate.candidateProfile?.experience
      ? JSON.parse(candidate.candidateProfile.experience)
          .map((exp: any) => `${exp.job_title} at ${exp.company}`)
          .join(", ")
      : "";

    const educationText = candidate.candidateProfile?.education
      ? JSON.parse(candidate.candidateProfile.education)
          .map((edu: any) => `${edu.degree} in ${edu.field}`)
          .join(", ")
      : "";

    const combinedText = `Skills: ${skillsText}. Experience: ${experienceText}. Education: ${educationText}`;

    // Create embeddings
    const combinedVector = await createEmbedding(combinedText);
    const skillVector = skillsText ? await createEmbedding(skillsText) : [];
    const experienceVector = experienceText
      ? await createEmbedding(experienceText)
      : [];
    const educationVector = educationText
      ? await createEmbedding(educationText)
      : [];

    // Save to database
    const existingVector = await prisma.candidateVector.findUnique({
      where: { candidate_id: candidateId },
    });

    const vectorData = {
      skill_vector: skillVector,
      experience_vector: experienceVector,
      education_vector: educationVector,
      combined_vector: combinedVector,
      vector_version: "v1.0",
    };

    if (existingVector) {
      await prisma.candidateVector.update({
        where: { candidate_id: candidateId },
        data: vectorData,
      });
    } else {
      await prisma.candidateVector.create({
        data: {
          candidate_id: candidateId,
          ...vectorData,
        },
      });
    }

    // Store in Pinecone
    await storeCandidateVector(candidateId, combinedVector, {
      skills_count: candidate.candidateSkills.length,
      full_name: candidate.full_name,
      email: candidate.email,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating candidate vector:", error);
    const serviceError: CandidateServiceError = new Error(
      "Failed to update candidate vector"
    );
    serviceError.code = "VECTOR_UPDATE_FAILED";
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// Get job recommendations for candidate
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
      // If no vector exists, create one first
      await updateCandidateVector(candidateId);
      return getJobRecommendations(candidateId, limit);
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


// Calculate profile completeness
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

    // Skills score (25 points)
    const skillsCount = candidate.candidateSkills.length;
    const skillsScore = Math.min(25, skillsCount * 2.5);
    totalScore += skillsScore;

    if (skillsCount < 10) {
      missingFields.push("skills");
      suggestions.push("Add more skills to improve your profile");
    }

    // Experience score (25 points)
    let experienceScore = 0;
    try {
      const experience = candidate.candidateProfile?.experience
        ? JSON.parse(candidate.candidateProfile.experience)
        : [];
      experienceScore = Math.min(25, experience.length * 8.33);
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

    // Document score (10 points) - Reduced from 15 to maintain total 100
    const documentScore = candidate.candidateDocuments.length > 0 ? 10 : 0;
    totalScore += documentScore;

    if (documentScore === 0) {
      missingFields.push("cv_document");
      suggestions.push("Upload your CV/Resume");
    }

    // Save completeness data
    const completenessData: ProfileCompletenessScore = {
      overall_score: Math.round(totalScore),
      basic_info_score: basicInfoScore,
      skills_score: skillsScore,
      experience_score: experienceScore,
      education_score: educationScore,
      document_score: documentScore,
      profile_picture_score: profilePictureScore,
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

// Get candidate profile summary
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
            profile_picture_score:
              candidate.profileCompleteness.profile_picture_score, // NOW THIS WILL WORK
            missing_fields: candidate.profileCompleteness
              .missing_fields as string[],
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
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log("Temporary file cleaned up");
      } catch (cleanupError) {
        console.warn("Failed to cleanup temporary file:", cleanupError);
      }
    }

    // Delete old Cloudinary image if exists
    if (oldPictureUrl && oldPictureUrl !== cloudinaryResult.secure_url) {
      try {
        // Extract public_id from old URL
        const urlParts = oldPictureUrl.split("/");
        const publicIdWithExt = urlParts[urlParts.length - 1];
        const publicId = `hiralent/profile-pictures/${
          publicIdWithExt.split(".")[0]
        }`;

        await cloudinary.uploader.destroy(publicId);
        console.log("Old profile picture deleted from Cloudinary");
      } catch (deleteError) {
        console.warn("Failed to delete old profile picture:", deleteError);
      }
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
      try {
        fs.unlinkSync(tempFilePath);
        console.log("Temporary file cleaned up after error");
      } catch (cleanupError) {
        console.warn(
          "Failed to cleanup temporary file after error:",
          cleanupError
        );
      }
    }

    // Re-throw with more context
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Profile picture upload failed: ${errorMessage}`);
  }
};
