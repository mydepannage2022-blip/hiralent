import { PrismaClient } from '../generated/prisma';
import { extractSkillsFromText, predictCareerPath, createEmbedding, generateJobMatchReasoning } from '../lib/openai';
import { storeCandidateVector, findSimilarJobs, storeJobVector } from '../lib/pinecone';
import { parseDocument, preprocessText, extractContactInfo } from '../utils/documentParser.util';
import { 
  CVUploadResponse,
  AIExtractionResult,
  CareerPredictionResult,
  JobRecommendation,
  ProfileCompletenessScore,
  CandidateProfileSummary,
  CandidateServiceError
} from '../types/candidate.types';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Upload and process CV/Resume
export const uploadAndProcessCV = async (candidateId: string, file: Express.Multer.File): Promise<CVUploadResponse> => {
  try {
    // Save document metadata
    const document = await prisma.candidateDocument.create({
      data: {
        candidate_id: candidateId,
        file_name: file.originalname,
        file_path: file.path,
        file_type: file.mimetype,
        file_size: file.size,
        upload_status: 'uploaded',
        extraction_status: 'pending'
      }
    });

    // Parse the document asynchronously
    processDocumentAsync(document.document_id, candidateId);

    return {
      success: true,
      document_id: document.document_id,
      message: 'CV uploaded successfully. Processing in background.'
    };
  } catch (error) {
    console.error('Error uploading CV:', error);
    const serviceError: CandidateServiceError = new Error('Failed to upload CV');
    serviceError.code = 'UPLOAD_FAILED';
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// Process document in background
const processDocumentAsync = async (documentId: string, candidateId: string): Promise<void> => {
  try {
    // Update status to processing
    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: { extraction_status: 'processing' }
    });

    // Get document info
    const document = await prisma.candidateDocument.findUnique({
      where: { document_id: documentId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Parse document text
    const parsedDoc = await parseDocument(document.file_path, document.file_type);
    const processedText = preprocessText(parsedDoc.text);

    // Update document with extracted text
    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: { 
        processed_text: processedText,
        extraction_status: 'completed'
      }
    });

    // Create skill extraction record
    const skillExtraction = await prisma.skillExtraction.create({
      data: {
        document_id: documentId,
        candidate_id: candidateId,
        status: 'processing',
        ai_provider: 'openai'
      }
    });

    // Extract skills using AI
    const startTime = Date.now();
    const extractedData: AIExtractionResult = await extractSkillsFromText(processedText);
    const processingTime = Date.now() - startTime;

    // Update skill extraction record
    await prisma.skillExtraction.update({
      where: { extraction_id: skillExtraction.extraction_id },
      data: {
        status: 'completed',
        raw_response: JSON.stringify(extractedData),
        extracted_skills: extractedData,
        processing_time: processingTime
      }
    });

    // Save extracted skills
    if (extractedData.skills && Array.isArray(extractedData.skills)) {
      for (const skill of extractedData.skills) {
        await prisma.candidateSkill.create({
          data: {
            candidate_id: candidateId,
            skill_name: skill.name,
            skill_category: skill.category || 'technical',
            proficiency: skill.proficiency || 'intermediate',
            years_experience: skill.years_experience || 0,
            confidence_score: 0.8, // Default confidence
            source_type: 'cv_extraction',
            source_document_id: documentId
          }
        });
      }
    }

    // Update candidate profile with extracted data
    await updateCandidateProfile(candidateId, extractedData);

    // Generate career prediction
    await generateCareerPrediction(candidateId);

    // Create/update candidate vector for job matching
    await updateCandidateVector(candidateId);

    // Calculate profile completeness
    await calculateProfileCompleteness(candidateId);

  } catch (error) {
    console.error('Error processing document:', error);
    
    // Update extraction status to failed
    await prisma.skillExtraction.updateMany({
      where: { 
        document_id: documentId,
        status: 'processing'
      },
      data: {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

// Update candidate profile with extracted data
const updateCandidateProfile = async (candidateId: string, extractedData: AIExtractionResult): Promise<void> => {
  try {
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId }
    });

    const profileData = {
      skills: JSON.stringify(extractedData.skills || []),
      education: JSON.stringify(extractedData.education || []),
      experience: JSON.stringify(extractedData.experience || [])
    };

    if (existingProfile) {
      await prisma.candidateProfile.update({
        where: { candidate_id: candidateId },
        data: profileData
      });
    } else {
      await prisma.candidateProfile.create({
        data: {
          candidate_id: candidateId,
          ...profileData
        }
      });
    }
  } catch (error) {
    console.error('Error updating candidate profile:', error);
  }
};

// Generate AI career prediction
export const generateCareerPrediction = async (candidateId: string): Promise<CareerPredictionResult> => {
  try {
    // Get candidate data
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Prepare data for AI prediction
    const candidateData = {
      skills: candidate.candidateSkills.map(s => ({
        name: s.skill_name,
        category: s.skill_category || 'technical',
        proficiency: s.proficiency || 'intermediate',
        years_experience: s.years_experience || 0
      })),
      education: candidate.candidateProfile?.education ? JSON.parse(candidate.candidateProfile.education) : [],
      experience: candidate.candidateProfile?.experience ? JSON.parse(candidate.candidateProfile.experience) : []
    };

    // Generate prediction using AI
    const prediction: CareerPredictionResult = await predictCareerPath(candidateData);

    // Save prediction
    await prisma.careerPrediction.create({
      data: {
        candidate_id: candidateId,
        current_role: prediction.current_role,
        predicted_roles: prediction.predicted_roles,
        career_path: prediction.career_path,
        skill_gaps: prediction.skill_gaps,
        salary_prediction: prediction.salary_prediction,
        confidence_score: prediction.confidence_score || 0.7,
        ai_model_version: 'gpt-4o-mini-v1',
        input_data_summary: `Skills: ${candidateData.skills.length}, Experience: ${candidateData.experience.length}`
      }
    });

    return prediction;
  } catch (error) {
    console.error('Error generating career prediction:', error);
    const serviceError: CandidateServiceError = new Error('Failed to generate career prediction');
    serviceError.code = 'PREDICTION_FAILED';
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// Create/update candidate vector for job matching
export const updateCandidateVector = async (candidateId: string): Promise<{ success: boolean }> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Create text representation for embedding
    const skillsText = candidate.candidateSkills
      .map(s => `${s.skill_name} (${s.proficiency})`)
      .join(', ');

    const experienceText = candidate.candidateProfile?.experience 
      ? JSON.parse(candidate.candidateProfile.experience)
          .map((exp: any) => `${exp.job_title} at ${exp.company}`)
          .join(', ')
      : '';

    const educationText = candidate.candidateProfile?.education
      ? JSON.parse(candidate.candidateProfile.education)
          .map((edu: any) => `${edu.degree} in ${edu.field}`)
          .join(', ')
      : '';

    const combinedText = `Skills: ${skillsText}. Experience: ${experienceText}. Education: ${educationText}`;

    // Create embeddings
    const combinedVector = await createEmbedding(combinedText);
    const skillVector = skillsText ? await createEmbedding(skillsText) : [];
    const experienceVector = experienceText ? await createEmbedding(experienceText) : [];
    const educationVector = educationText ? await createEmbedding(educationText) : [];

    // Save to database
    const existingVector = await prisma.candidateVector.findUnique({
      where: { candidate_id: candidateId }
    });

    const vectorData = {
      skill_vector: skillVector,
      experience_vector: experienceVector,
      education_vector: educationVector,
      combined_vector: combinedVector,
      vector_version: 'v1.0'
    };

    if (existingVector) {
      await prisma.candidateVector.update({
        where: { candidate_id: candidateId },
        data: vectorData
      });
    } else {
      await prisma.candidateVector.create({
        data: {
          candidate_id: candidateId,
          ...vectorData
        }
      });
    }

    // Store in Pinecone
    await storeCandidateVector(candidateId, combinedVector, {
      skills_count: candidate.candidateSkills.length,
      full_name: candidate.full_name,
      email: candidate.email
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating candidate vector:', error);
    const serviceError: CandidateServiceError = new Error('Failed to update candidate vector');
    serviceError.code = 'VECTOR_UPDATE_FAILED';
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// Get job recommendations for candidate
export const getJobRecommendations = async (candidateId: string, limit: number = 20): Promise<JobRecommendation[]> => {
  try {
    // Get candidate vector
    const candidateVector = await prisma.candidateVector.findUnique({
      where: { candidate_id: candidateId }
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
      where: { candidate_id: candidateId }
    });

    // Process each job recommendation
    const recommendations: JobRecommendation[] = [];
    for (const match of similarJobs) {
      const jobId = match.metadata?.jobId;
      if (!jobId) continue;

      // Get job details
      const job = await prisma.recruiterJob.findUnique({
        where: { job_id: jobId },
        include: {
          recruiter: { select: { full_name: true } },
          agency: { select: { name: true } }
        }
      });

      if (!job) continue;

      // Generate detailed match reasoning
      const jobRequirements = {
        title: job.title,
        required_skills: job.required_skills,
        description: job.description,
        location: job.location
      };

      const matchReasoning = await generateJobMatchReasoning(candidateSkills, jobRequirements);

      // Save recommendation
      const existing = await prisma.jobRecommendation.findFirst({
        where: {
          candidate_id: candidateId,
          job_id: jobId
        }
      });

      if (!existing) {
        await prisma.jobRecommendation.create({
          data: {
            candidate_id: candidateId,
            job_id: jobId,
            match_score: match.score || 0,
            skill_match: matchReasoning,
            ai_reasoning: matchReasoning.reasoning
          }
        });
      }

      recommendations.push({
        job_id: jobId,
        title: job.title,
        company: job.agency.name,
        location: job.location,
        salary_range: job.salary_range || undefined,
        match_score: match.score || 0,
        match_reasoning: matchReasoning,
        created_at: job.created_at
      });
    }

    return recommendations;
  } catch (error) {
    console.error('Error getting job recommendations:', error);
    const serviceError: CandidateServiceError = new Error('Failed to get job recommendations');
    serviceError.code = 'RECOMMENDATIONS_FAILED';
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// Calculate profile completeness
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
      missingFields.push('phone_number');
      suggestions.push('Add your phone number for better contact');
    }

    // Skills score (25 points)
    const skillsCount = candidate.candidateSkills.length;
    const skillsScore = Math.min(25, skillsCount * 2.5);
    totalScore += skillsScore;

    if (skillsCount < 10) {
      missingFields.push('skills');
      suggestions.push('Add more skills to improve your profile');
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
      missingFields.push('experience');
      suggestions.push('Add more work experience details');
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
      missingFields.push('education');
      suggestions.push('Add your educational background');
    }

    // Document score (15 points)
    const documentScore = candidate.candidateDocuments.length > 0 ? 15 : 0;
    totalScore += documentScore;

    if (documentScore === 0) {
      missingFields.push('cv_document');
      suggestions.push('Upload your CV/Resume');
    }

    // Save completeness data
    const completenessData: ProfileCompletenessScore = {
      overall_score: Math.round(totalScore),
      basic_info_score: basicInfoScore,
      skills_score: skillsScore,
      experience_score: experienceScore,
      education_score: educationScore,
      document_score: documentScore,
      missing_fields: missingFields,
      suggestions: suggestions
    };

    const existing = await prisma.profileCompleteness.findUnique({
      where: { candidate_id: candidateId }
    });

    if (existing) {
      await prisma.profileCompleteness.update({
        where: { candidate_id: candidateId },
        data: completenessData
      });
    } else {
      await prisma.profileCompleteness.create({
        data: {
          candidate_id: candidateId,
          ...completenessData
        }
      });
    }

    return completenessData;
  } catch (error) {
    console.error('Error calculating profile completeness:', error);
    const serviceError: CandidateServiceError = new Error('Failed to calculate profile completeness');
    serviceError.code = 'COMPLETENESS_CALCULATION_FAILED';
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// Get candidate profile summary
export const getProfileSummary = async (candidateId: string): Promise<CandidateProfileSummary> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
        candidateDocuments: true,
        careerPredictions: {
          orderBy: { created_at: 'desc' },
          take: 1
        },
        profileCompleteness: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    return {
      basic_info: {
        name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone_number || undefined
      },
      skills: candidate.candidateSkills,
      profile_completeness: candidate.profileCompleteness || undefined,
      career_prediction: candidate.careerPredictions[0] || undefined,
      documents: candidate.candidateDocuments.map(doc => ({
        id: doc.document_id,
        name: doc.file_name,
        upload_status: doc.upload_status,
        extraction_status: doc.extraction_status || undefined
      }))
    };
  } catch (error) {
    console.error('Error getting profile summary:', error);
    const serviceError: CandidateServiceError = new Error('Failed to get profile summary');
    serviceError.code = 'PROFILE_SUMMARY_FAILED';
    serviceError.statusCode = 500;
    throw serviceError;
  }
};