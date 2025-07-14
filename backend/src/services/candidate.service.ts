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
import { any } from 'zod';

const prisma = new PrismaClient();


// Upload and process CV/Resume
export const uploadAndProcessCV = async (candidateId: string, file: Express.Multer.File): Promise<CVUploadResponse> => {
  try {
    // Save document metadata
    const document = await prisma.candidateDocument.create({
      data: {
        candidateId: candidateId,
        fileName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadStatus: 'uploaded',
        extractionStatus: 'pending'
      }
    });

    // Parse the document asynchronously
    processDocumentAsync(document.documentId, candidateId);

    return {
      success: true,
      documentId: document.documentId,
      document: {
        name: document.fileName,
        uploadStatus: document.uploadStatus,
        extractionStatus: document.extractionStatus,
        candidateId: candidateId,
        wholeDocument: fs.readFileSync(document.filePath, 'utf-8')
      },
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
      where: { documentId: documentId },
      data: { extractionStatus: 'processing' }
    });

    // Get document info
    const document = await prisma.candidateDocument.findUnique({
      where: { documentId: documentId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Parse document text
    const parsedDoc = await parseDocument(document.filePath, document.fileType);
    const processedText = preprocessText(parsedDoc.text);
    console.log('Processed Text:', processedText);
    // Update document with extracted text
    await prisma.candidateDocument.update({
      where: { documentId: documentId },
      data: { 
        processedText: processedText,
        extractionStatus: 'completed'
      }
    });

    // Create skill extraction record
    const skillExtraction = await prisma.skillExtraction.create({
      data: {
        documentId: documentId,
        candidateId: candidateId,
        status: 'processing',
        aiProvider: 'openai'
      }
    });
    console.log('Skill Extraction Record:', skillExtraction);
    // Extract skills using AI
    const startTime = Date.now();
    const extractedData: AIExtractionResult = await extractSkillsFromText(processedText);
    const processingTime = Date.now() - startTime;

          // Update skill extraction record
      await prisma.skillExtraction.update({
        where: { extractionId: skillExtraction.extractionId },
        data: {
          status: 'completed',
          rawResponse: JSON.stringify(extractedData),
          extractedSkills: JSON.stringify(extractedData),
          processingTime: processingTime
        }
      });

    // Save extracted skills
    if (extractedData.skills && Array.isArray(extractedData.skills)) {
      for (const skill of extractedData.skills) {
        await prisma.candidateSkill.create({
          data: {
            candidateId: candidateId,
            skillName: skill.name,
            skillCategory: skill.category || 'technical',
            proficiency: skill.proficiency || 'intermediate',
            yearsExperience: skill.yearsExperience || 0,
            confidenceScore: 0.8, // Default confidence
            sourceType: 'cv_extraction',
            sourceDocumentId: documentId
          }
        });
      }
    }
    console.log('Extracted Skills:', extractedData.skills);
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
        documentId: documentId,
        status: 'processing'
      },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

// Update candidate profile with extracted data
const updateCandidateProfile = async (candidateId: string, extractedData: AIExtractionResult): Promise<void> => {
  try {
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidateId: candidateId }
    });

    const profileData = {
      skills: JSON.stringify(extractedData.skills || []),
      education: JSON.stringify(extractedData.education || []),
      experience: JSON.stringify(extractedData.experience || [])
    };

    if (existingProfile) {
      await prisma.candidateProfile.update({
        where: { candidateId: candidateId },
        data: profileData
      });
    } else {
      await prisma.candidateProfile.create({
        data: {
          candidateId: candidateId,
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
      where: { userId: candidateId },
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
        name: s.skillName,
        category: (s.skillCategory as 'technical' | 'soft' | 'language' | 'certification') || 'technical',
        proficiency: (s.proficiency as 'beginner' | 'intermediate' | 'advanced' | 'expert') || 'intermediate',
        yearsExperience: s.yearsExperience || 0
      })),
      education: candidate.candidateProfile?.education ? JSON.parse(candidate.candidateProfile.education) : [],
      experience: candidate.candidateProfile?.experience ? JSON.parse(candidate.candidateProfile.experience) : []
    };

    // Generate prediction using AI
    const prediction: CareerPredictionResult = await predictCareerPath(candidateData);

    // Save prediction
    await prisma.careerPrediction.create({
      data: {
        candidateId: candidateId,
        currentRole: prediction.currentRole,
        predictedRoles: JSON.stringify(prediction.predictedRoles),
        careerPath: JSON.stringify(prediction.careerPath),
        skillGaps: JSON.stringify(prediction.skillGaps),
        salaryPrediction: JSON.stringify(prediction.salaryPrediction),
        confidenceScore: prediction.confidenceScore || 0.7,
        aiModelVersion: 'gemini-0.5',
        inputDataSummary: `Skills: ${candidateData.skills.length}, Experience: ${candidateData.experience.length}`
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
      where: { userId: candidateId },
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
      .map(s => `${s.skillName} (${s.proficiency})`)
      .join(', ');

    const experienceText = candidate.candidateProfile?.experience 
      ? JSON.parse(candidate.candidateProfile.experience)
          .map((exp: any) => `${exp.jobTitle} at ${exp.company}`)
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
      where: { candidateId: candidateId }
    });

    const vectorData = {
      skillVector: skillVector,
      experienceVector: experienceVector,
      educationVector: educationVector,
      combinedVector: combinedVector,
      vectorVersion: 'v1.0'
    };

    if (existingVector) {
      await prisma.candidateVector.update({
        where: { candidateId: candidateId },
        data: vectorData
      });
    } else {
      await prisma.candidateVector.create({
        data: {
          candidateId: candidateId,
          ...vectorData
        }
      });
    }

    // Store in Pinecone
    await storeCandidateVector(candidateId, combinedVector, {
      skillsCount: candidate.candidateSkills.length,
      fullName: candidate.fullName,
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
      where: { candidateId: candidateId }
    });

    if (!candidateVector) {
      // If no vector exists, create one first
      await updateCandidateVector(candidateId);
      return getJobRecommendations(candidateId, limit);
    }

    const combinedVector = candidateVector.combinedVector as number[];

    // Find similar jobs using Pinecone
    const similarJobs = await findSimilarJobs(combinedVector, limit);

    // Get candidate skills for detailed matching
    const candidateSkills = await prisma.candidateSkill.findMany({
      where: { candidateId: candidateId }
    });

    // Process each job recommendation
    const recommendations: JobRecommendation[] = [];
    for (const match of similarJobs) {
      const jobId = match.metadata?.jobId;
      if (!jobId) continue;

      // Get job details
      const job = await prisma.recruiterJob.findUnique({
        where: { jobId: jobId },
        include: {
          recruiter: { select: { fullName: true } },
          agency: { select: { name: true } }
        }
      });

      if (!job) continue;

      // Generate detailed match reasoning
      const jobRequirements = {
        title: job.title,
        requiredSkills: job.requiredSkills,
        description: job.description,
        location: job.location
      };

      const matchReasoning = await generateJobMatchReasoning(candidateSkills, jobRequirements);

      // Save recommendation
      const existing = await prisma.jobRecommendation.findFirst({
        where: {
          candidateId: candidateId,
          jobId: jobId
        }
      });

      if (!existing) {
        await prisma.jobRecommendation.create({
          data: {
            candidateId: candidateId,
            jobId: jobId,
            matchScore: match.score || 0,
            skillMatch: JSON.stringify(matchReasoning),
            aiReasoning: matchReasoning.reasoning
          }
        });
      }

      recommendations.push({
        jobId: jobId,
        title: job.title,
        company: job.agency.name,
        location: job.location,
        salaryRange: job.salaryRange || undefined,
        matchScore: match.score || 0,
        matchReasoning: matchReasoning,
        createdAt: job.createdAt
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
      where: { userId: candidateId },
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
    if (candidate.fullName) basicInfoScore += 5;
    if (candidate.email) basicInfoScore += 5;
    if (candidate.phoneNumber) basicInfoScore += 5;
    if (candidate.candidateProfile?.resumeUrl) basicInfoScore += 5;
    totalScore += basicInfoScore;

    if (!candidate.phoneNumber) {
      missingFields.push('phoneNumber');
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
      missingFields.push('cvDocument');
      suggestions.push('Upload your CV/Resume');
    }

    // Save completeness data
    const completenessData: ProfileCompletenessScore = {
      overallScore: Math.round(totalScore),
      basicInfoScore: basicInfoScore,
      skillsScore: skillsScore,
      experienceScore: experienceScore,
      educationScore: educationScore,
      documentScore: documentScore,
      missingFields: missingFields,
      suggestions: suggestions
    };

    const existing = await prisma.profileCompleteness.findUnique({
      where: { candidateId: candidateId }
    });

    if (existing) {
      await prisma.profileCompleteness.update({
        where: { candidateId: candidateId },
        data: completenessData
      });
    } else {
      await prisma.profileCompleteness.create({
        data: {
          candidateId: candidateId,
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
      where: { userId: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
        candidateDocuments: true,
        careerPredictions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        profileCompleteness: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    return {
      basicInfo: {
        name: candidate.fullName,
        email: candidate.email,
        phone: candidate.phoneNumber || undefined
      },
      skills: candidate.candidateSkills,
      profileCompleteness: candidate.profileCompleteness ? {
        overallScore: candidate.profileCompleteness.overallScore,
        basicInfoScore: candidate.profileCompleteness.basicInfoScore,
        skillsScore: candidate.profileCompleteness.skillsScore,
        experienceScore: candidate.profileCompleteness.experienceScore,
        educationScore: candidate.profileCompleteness.educationScore,
        documentScore: candidate.profileCompleteness.documentScore,
        missingFields: candidate.profileCompleteness.missingFields as string[],
        suggestions: candidate.profileCompleteness.suggestions as string[]
      } : undefined,
      careerPrediction: candidate.careerPredictions[0] ? {
        currentRole: candidate.careerPredictions[0].currentRole || '',
        predictedRoles: JSON.parse(candidate.careerPredictions[0].predictedRoles as string),
        careerPath: JSON.parse(candidate.careerPredictions[0].careerPath as string),
        skillGaps: JSON.parse(candidate.careerPredictions[0].skillGaps as string),
        salaryPrediction: JSON.parse(candidate.careerPredictions[0].salaryPrediction as string),
        confidenceScore: candidate.careerPredictions[0].confidenceScore
      } : undefined,
      documents: candidate.candidateDocuments.map(doc => ({
        id: doc.documentId,
        name: doc.fileName,
        uploadStatus: doc.uploadStatus,
        extractionStatus: doc.extractionStatus || undefined
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