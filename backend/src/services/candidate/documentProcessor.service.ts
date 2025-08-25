import { PrismaClient } from "@prisma/client";
import {
  extractSkillsFromText,
  createEmbedding,
} from "../../lib/openai";
import {
  storeCandidateVector,
} from "../../lib/pinecone";
import {
  parseDocument,
  preprocessText,
} from "../../utils/documentParser.util";
import {
  AIExtractionResult,
  CareerPredictionResult,
  CandidateServiceError,
} from "../../types/candidate.types";
import fs from "fs";
import axios from "axios";

const prisma = new PrismaClient();

export const processDocumentAsync = async (
  documentId: string,
  candidateId: string,
  cloudinaryUrl: string
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

    // Download file from Cloudinary for AI processing using axios
    console.log("Downloading file from Cloudinary for processing...");
    console.log("Direct download URL:", cloudinaryUrl);
    
    // Use direct URL without any transformations or flags
    const response = await axios({
      method: 'GET',
      url: cloudinaryUrl, // Use direct secure_url
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to download file from Cloudinary: ${response.status} ${response.statusText}`);
    }
    
    console.log("File downloaded successfully, size:", response.data.byteLength);
    
    // Convert arraybuffer to buffer
    const buffer = Buffer.from(response.data);
    
    // Create temporary file for processing
    const tempFilePath = `./temp_processing_${documentId}.pdf`;
    fs.writeFileSync(tempFilePath, buffer);
    console.log("Temporary file created for processing:", tempFilePath);

    try {
      // Parse document text
      const parsedDoc = await parseDocument(tempFilePath, document.file_type);
      const processedText = preprocessText(parsedDoc.text);
      console.log("Text extraction completed, length:", processedText.length);

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
          ai_provider: "gemini",
        },
      });

      // Extract skills using AI
      console.log("Starting AI skill extraction...");
      const startTime = Date.now();
      const extractedData: AIExtractionResult = await extractSkillsFromText(processedText);
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

      // Save extracted skills to database
      if (extractedData.skills && Array.isArray(extractedData.skills)) {
        console.log(`Saving ${extractedData.skills.length} extracted skills...`);
        for (const skill of extractedData.skills) {
          await prisma.candidateSkill.create({
            data: {
              candidate_id: candidateId,
              skill_name: skill.name,
              skill_category: skill.category || "technical",
              proficiency: skill.proficiency || "intermediate",
              years_experience: skill.years_experience || 0,
              confidence_score: 0.85,
              source_type: "cv_extraction",
              source_document_id: documentId,
            },
          });
        }
      }

      // Update candidate profile with extracted data
      await updateCandidateProfile(candidateId, extractedData);

      // Generate new career prediction
      await generateCareerPrediction(candidateId);

      // Update candidate vector for job matching
      await updateCandidateVector(candidateId);

      // Recalculate profile completeness
      await calculateProfileCompleteness(candidateId);

      console.log("✅ Document processing completed successfully");
    } finally {
      // Always clean up temporary processing file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log("Temporary processing file cleaned up");
      }
    }
  } catch (error) {
    console.error("❌ Error processing document:", error);

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

    // Update document status to failed
    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: { extraction_status: "failed" },
    });
  }
};

// Helper function to update candidate profile
const updateCandidateProfile = async (
  candidateId: string,
  extractedData: AIExtractionResult
): Promise<void> => {
  try {
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
    });

    // Get all skill IDs that were extracted and saved
    const extractedSkills = await prisma.candidateSkill.findMany({
      where: { 
        candidate_id: candidateId,
        source_type: "cv_extraction" 
      },
      select: { skill_id: true }
    });

    const skillIds = extractedSkills.map(skill => skill.skill_id);

    const profileData = {
      headline: extractedData.headline ? extractedData.headline.substring(0, 120) : undefined,
      skills: skillIds, // Array of skill IDs instead of JSON
      education: JSON.stringify(extractedData.education || []),
      experience: JSON.stringify(extractedData.experience || []),
    };

    if (existingProfile) {
      // Merge existing skill IDs with new ones (avoid duplicates)
      const existingSkillIds = existingProfile.skills || [];
      const mergedSkillIds = [...new Set([...existingSkillIds, ...skillIds])];
      
      await prisma.candidateProfile.update({
        where: { candidate_id: candidateId },
        data: {
          ...profileData,
          skills: mergedSkillIds, // Merged skill IDs
        },
      });
    } else {
      await prisma.candidateProfile.create({
        data: {
          candidate_id: candidateId,
          ...profileData,
        },
      });
    }

    // Log results
    console.log(`Profile updated with ${skillIds.length} new skill IDs`);
    if (extractedData.headline) {
      console.log("Headline extracted and stored:", extractedData.headline);
    }
    
  } catch (error) {
    console.error("Error updating candidate profile:", error);
  }
};



// Helper function to generate career prediction
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

    // Generate prediction using AI (you'll need to import this function)
    const { predictCareerPath } = await import("../../lib/openai");
    const prediction: CareerPredictionResult = await predictCareerPath(candidateData);

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


export const updateCandidateVector = async (
  candidateId: string
): Promise<{ success: boolean }> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true // Get skills from CandidateSkill table directly
      },
    });

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    // Create text representation for embedding
    const headlineText = candidate.candidateProfile?.headline || "";

    // Use actual skill names from CandidateSkill table (not profile JSON)
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

    // Include headline in combined text
    const combinedText = `Headline: ${headlineText}. Skills: ${skillsText}. Experience: ${experienceText}. Education: ${educationText}`;

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
      vector_version: "v1.1", // Updated version for new skill flow
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

    // Store in Pinecone - include headline in metadata
    await storeCandidateVector(candidateId, combinedVector, {
      skills_count: candidate.candidateSkills.length,
      full_name: candidate.full_name,
      email: candidate.email,
      headline: headlineText,
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

// Helper function to calculate profile completeness
const calculateProfileCompleteness = async (candidateId: string) => {
  try {
    // Import the function from main service
    const { calculateProfileCompleteness } = await import("../candidate.service");
    await calculateProfileCompleteness(candidateId);
  } catch (error) {
    console.error("Error calculating profile completeness:", error);
  }
};