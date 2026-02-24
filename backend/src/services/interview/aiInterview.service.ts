import prisma from '../../lib/prisma';
import { generateGeminiJSON } from '../../lib/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_INTERVIEW_PROMPTS } from './aiInterview.prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
import { sendEmail } from '../../utils/email.util';

/**
 * Helper function for interview analysis with higher token limits
 * Dedicated function to avoid modifying shared openai.ts
 */
async function generateInterviewAnalysisJSON(systemPrompt: string, userPrompt: string): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192, // Higher limit for detailed interview analysis
      }
    });

    const fullPrompt = `
    ${systemPrompt}

    ${userPrompt}

    CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no code blocks. Start with { and end with }. Do not include any text outside the JSON object.
    `.trim();

    const result = await model.generateContent(fullPrompt);
    let text = result.response.text().trim();

    // Remove markdown code blocks
    if (text.startsWith('```json')) {
      text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```[a-z]*\s*/, '').replace(/\s*```$/, '');
    }

    // Extract JSON
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    // Clean up
    text = text
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote keys
      .replace(/:\s*'([^']*?)'/g, ':"$1"') // Convert single quotes to double
      .replace(/\\n/g, ' ') // Remove newlines
      .replace(/\\\\/g, '\\') // Fix escaped backslashes
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control chars

    const parsed = JSON.parse(text);
    return parsed;

  } catch (error: any) {
    console.error('❌ Interview analysis JSON generation failed:', error.message);
    console.error('Error details:', error);
    throw new Error(`Failed to generate interview analysis: ${error.message}`);
  }
}
import { getInterviewAssignedEmailTemplate } from '../emailTemplates.service';
import {
  AIInterviewStatus,
  AIQualification,
  CreateInterviewParams,
  AssignInterviewParams,
  StartInterviewParams,
  SubmitResponseParams,
  EndInterviewParams,
  GenerateQuestionsParams,
  AnalyzeResponseParams,
  GenerateFollowUpParams,
  FinalEvaluationParams,
  InterviewQuestion,
  CandidateResponse,
  ResponseAnalysis,
  SentimentAnalysis,
  SoftSkillsAnalysis,
  FinalEvaluation,
  TranscriptEntry,
  InterviewSessionResponse,
  InterviewDetailedResult,
  CandidateInterviewListItem,
  RecruiterInterviewListItem,
} from '../../types/interview.types';

// ==================== Interview Session Management ====================

/**
 * Create a new AI interview session (internal use - prefer assignInterview for recruiter flow)
 */
export const createInterview = async (params: CreateInterviewParams): Promise<{ interviewId: string }> => {
  const interview = await prisma.aIInterviewResult.create({
    data: {
      candidate_id: params.candidateId,
      application_id: params.applicationId,
      job_id: params.jobId,
      interview_type: params.interviewType,
      status: 'PENDING',
      questions_asked: [],
      responses: [],
      transcript: [],
    },
  });

  return { interviewId: interview.interview_id };
};

/**
 * Assign an AI interview to a candidate (called by recruiter)
 */
export const assignInterview = async (params: AssignInterviewParams): Promise<{ interviewId: string }> => {
  // Verify the application exists and belongs to this job
  const application = await prisma.jobApplication.findUnique({
    where: { application_id: params.applicationId },
    include: {
      job: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.job_id !== params.jobId) {
    throw new Error('Application does not match the specified job');
  }

  if (application.candidate_id !== params.candidateId) {
    throw new Error('Application does not belong to the specified candidate');
  }

  // Check if interview already exists for this application
  const existingInterview = await prisma.aIInterviewResult.findUnique({
    where: { application_id: params.applicationId },
  });

  if (existingInterview) {
    throw new Error('Interview already assigned for this application');
  }

  // Get candidate info for notification
  const candidate = await prisma.user.findUnique({
    where: { user_id: params.candidateId },
  });

  // Create the interview with scheduling info
  const interview = await prisma.aIInterviewResult.create({
    data: {
      candidate_id: params.candidateId,
      application_id: params.applicationId,
      job_id: params.jobId,
      interview_type: params.interviewType,
      status: 'PENDING',
      scheduled_date: params.scheduledDate,
      assigned_by: params.recruiterId,
      assigned_at: new Date(),
      questions_asked: [],
      responses: [],
      transcript: [],
    },
  });

  // Send notifications (async - don't block the response)
  const jobTitle = application.job?.title || 'Unknown Position';
  const companyName = application.job?.company?.full_name || 'Unknown Company';
  const candidateName = candidate?.full_name || 'Candidate';
  const candidateEmail = candidate?.email;
  const interviewLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate/dashboard/interviews/${interview.interview_id}`;

  // Send email notification in background (don't await to avoid blocking)
  sendInterviewEmailNotification({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    scheduledDate: params.scheduledDate,
    interviewLink,
  }).catch(err => {
    console.error('Failed to send interview email:', err);
  });

  return { interviewId: interview.interview_id };
};

/**
 * Send email notification for interview assignment
 */
async function sendInterviewEmailNotification(params: {
  candidateName: string;
  candidateEmail?: string;
  jobTitle: string;
  companyName: string;
  scheduledDate: Date;
  interviewLink: string;
}): Promise<void> {
  const { candidateName, candidateEmail, jobTitle, companyName, scheduledDate, interviewLink } = params;

  if (candidateEmail) {
    try {
      const emailHtml = getInterviewAssignedEmailTemplate(
        candidateName,
        jobTitle,
        companyName,
        scheduledDate,
        interviewLink
      );

      await sendEmail({
        to: candidateEmail,
        subject: `AI Interview Scheduled - ${jobTitle} at ${companyName}`,
        html: emailHtml,
      });
      console.log(`✅ Email notification sent to ${candidateEmail}`);
    } catch (err) {
      console.error('Failed to send email notification:', err);
    }
  } else {
    console.warn(`⚠️ No email address for candidate, skipping email notification`);
  }
}

/**
 * Get all interviews for a candidate (their assigned interviews)
 * Also performs lazy expiration check for PENDING interviews
 */
export const getCandidateInterviews = async (candidateId: string): Promise<CandidateInterviewListItem[]> => {
  const interviews = await prisma.aIInterviewResult.findMany({
    where: { candidate_id: candidateId },
    include: {
      application: {
        include: {
          job: {
            include: {
              company: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  // Lazy expiration check: update any PENDING interviews that should be expired
  const expiredIds: string[] = [];
  // Lazy abandonment check: update any IN_PROGRESS interviews that were abandoned
  const abandonedIds: string[] = [];

  for (const interview of interviews) {
    if (interview.status === 'PENDING' && isInterviewExpired(interview.scheduled_date)) {
      expiredIds.push(interview.interview_id);
    }
    if (interview.status === 'IN_PROGRESS' && isInterviewAbandoned(interview.started_at)) {
      abandonedIds.push(interview.interview_id);
    }
  }

  if (expiredIds.length > 0) {
    await prisma.aIInterviewResult.updateMany({
      where: { interview_id: { in: expiredIds } },
      data: { status: 'EXPIRED' },
    });
    console.log(`⏰ Lazy check: Marked ${expiredIds.length} interview(s) as EXPIRED for candidate ${candidateId}`);
  }

  if (abandonedIds.length > 0) {
    await prisma.aIInterviewResult.updateMany({
      where: { interview_id: { in: abandonedIds } },
      data: { status: 'FAILED' },
    });
    console.log(`⏰ Lazy check: Marked ${abandonedIds.length} interview(s) as FAILED (abandoned) for candidate ${candidateId}`);
  }

  return interviews.map(interview => ({
    interviewId: interview.interview_id,
    // Return updated status for interviews we just marked
    status: expiredIds.includes(interview.interview_id)
      ? 'EXPIRED' as AIInterviewStatus
      : abandonedIds.includes(interview.interview_id)
        ? 'FAILED' as AIInterviewStatus
        : interview.status as AIInterviewStatus,
    interviewType: interview.interview_type,
    scheduledDate: interview.scheduled_date || undefined,
    jobTitle: interview.application?.job?.title || 'Unknown Position',
    companyName: interview.application?.job?.company?.full_name || undefined,
    createdAt: interview.created_at,
    startedAt: interview.started_at || undefined,
    completedAt: interview.completed_at || undefined,
  }));
};

/**
 * Get all interviews assigned by a recruiter/company
 * Also performs lazy expiration check for PENDING interviews
 */
export const getRecruiterInterviews = async (recruiterId: string, companyId?: string): Promise<RecruiterInterviewListItem[]> => {
  // Get interviews either assigned by this recruiter OR for jobs from this company
  const interviews = await prisma.aIInterviewResult.findMany({
    where: {
      OR: [
        { assigned_by: recruiterId },
        ...(companyId ? [{
          application: {
            job: {
              company_id: companyId,
            },
          },
        }] : []),
      ],
    },
    include: {
      candidate: true,
      application: {
        include: {
          job: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  // Lazy expiration check: update any PENDING interviews that should be expired
  const expiredIds: string[] = [];
  // Lazy abandonment check: update any IN_PROGRESS interviews that were abandoned
  const abandonedIds: string[] = [];

  for (const interview of interviews) {
    if (interview.status === 'PENDING' && isInterviewExpired(interview.scheduled_date)) {
      expiredIds.push(interview.interview_id);
    }
    if (interview.status === 'IN_PROGRESS' && isInterviewAbandoned(interview.started_at)) {
      abandonedIds.push(interview.interview_id);
    }
  }

  if (expiredIds.length > 0) {
    await prisma.aIInterviewResult.updateMany({
      where: { interview_id: { in: expiredIds } },
      data: { status: 'EXPIRED' },
    });
    console.log(`⏰ Lazy check: Marked ${expiredIds.length} interview(s) as EXPIRED (recruiter view)`);
  }

  if (abandonedIds.length > 0) {
    await prisma.aIInterviewResult.updateMany({
      where: { interview_id: { in: abandonedIds } },
      data: { status: 'FAILED' },
    });
    console.log(`⏰ Lazy check: Marked ${abandonedIds.length} interview(s) as FAILED (abandoned, recruiter view)`);
  }

  return interviews.map(interview => ({
    interviewId: interview.interview_id,
    // Return updated status for interviews we just marked
    status: expiredIds.includes(interview.interview_id)
      ? 'EXPIRED' as AIInterviewStatus
      : abandonedIds.includes(interview.interview_id)
        ? 'FAILED' as AIInterviewStatus
        : interview.status as AIInterviewStatus,
    interviewType: interview.interview_type,
    scheduledDate: interview.scheduled_date || undefined,
    candidateName: interview.candidate?.full_name || 'Unknown',
    candidateEmail: interview.candidate?.email || 'Unknown',
    jobTitle: interview.application?.job?.title || 'Unknown Position',
    assignedAt: interview.assigned_at || interview.created_at,
    startedAt: interview.started_at || undefined,
    completedAt: interview.completed_at || undefined,
    qualification: interview.qualification as AIQualification | undefined,
    overallScore: interview.score ? parseInt(interview.score) : undefined,
  }));
};

/**
 * Start an interview session
 */
export const startInterview = async (params: StartInterviewParams): Promise<InterviewSessionResponse> => {
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: params.interviewId },
    include: {
      application: {
        include: {
          job: true,
        },
      },
      candidate: {
        include: {
          candidateProfile: true,
        },
      },
    },
  });

  if (!interview) {
    throw new Error('Interview not found');
  }

  if (interview.candidate_id !== params.candidateId) {
    throw new Error('Unauthorized access to interview');
  }

  // Check if scheduled time has arrived (cannot start before scheduled time)
  if (interview.status === 'PENDING' && interview.scheduled_date) {
    const scheduledTime = new Date(interview.scheduled_date).getTime();
    if (Date.now() < scheduledTime) {
      throw new Error('This interview is not available yet. Please wait until the scheduled time.');
    }
  }

  // Check if interview is expired (cannot start after 48h from scheduled time)
  if (interview.status === 'PENDING' && isInterviewExpired(interview.scheduled_date)) {
    await prisma.aIInterviewResult.update({
      where: { interview_id: params.interviewId },
      data: { status: 'EXPIRED' },
    });
    throw new Error('This interview has expired. Please contact the recruiter for a new interview.');
  }

  if (interview.status === 'EXPIRED') {
    throw new Error('This interview has expired. Please contact the recruiter for a new interview.');
  }

  // Check if IN_PROGRESS interview was abandoned (24h since started)
  if (interview.status === 'IN_PROGRESS' && isInterviewAbandoned(interview.started_at)) {
    await prisma.aIInterviewResult.update({
      where: { interview_id: params.interviewId },
      data: { status: 'FAILED' },
    });
    throw new Error('This interview session has timed out. Please contact the recruiter for a new interview.');
  }

  if (interview.status === 'FAILED') {
    throw new Error('This interview has failed or timed out. Please contact the recruiter for a new interview.');
  }

  // Handle IN_PROGRESS interviews (resume)
  if (interview.status === 'IN_PROGRESS') {
    const questions = (interview.questions_asked as unknown as InterviewQuestion[]) || [];
    const responses = (interview.responses as unknown as CandidateResponse[]) || [];

    // Sort questions by order
    const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

    // Find next unanswered question
    const answeredQuestionIds = responses.map(r => r.questionId);
    const nextQuestion = sortedQuestions.find(q => !answeredQuestionIds.includes(q.questionId));

    return {
      interviewId: interview.interview_id,
      status: interview.status as AIInterviewStatus,
      currentQuestion: nextQuestion || null,
      progress: {
        questionsAsked: responses.length + (nextQuestion ? 1 : 0),
        totalQuestions: sortedQuestions.length,
      },
      startedAt: interview.started_at || undefined,
    };
  }

  // Only PENDING interviews can be started fresh
  if (interview.status !== 'PENDING') {
    throw new Error(`Interview cannot be started. Current status: ${interview.status}`);
  }

  // Generate questions based on job and candidate profile
  const job = interview.application?.job;
  const candidateProfile = interview.candidate?.candidateProfile;

  const questions = await generateInterviewQuestions({
    jobTitle: job?.title || 'General Position',
    jobDescription: job?.description || '',
    requiredSkills: (job?.required_skills as string[]) || [],
    experienceLevel: job?.experience_level || 'mid',
    interviewType: interview.interview_type,
    questionCount: 8,
    candidateProfile: candidateProfile ? {
      skills: (candidateProfile.skills as string[]) || [],
      experience: [], // Could extract from experience JSON
    } : undefined,
  });

  // Sort questions by order to ensure consistent sequencing
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  // Update interview with questions and start time
  const updatedInterview = await prisma.aIInterviewResult.update({
    where: { interview_id: params.interviewId },
    data: {
      status: 'IN_PROGRESS',
      started_at: new Date(),
      questions_asked: sortedQuestions as unknown as any,
      total_questions: sortedQuestions.length,
      transcript: [{
        role: 'ai',
        content: sortedQuestions[0]?.questionText || 'Welcome to your interview.',
        timestamp: new Date().toISOString(),
        questionId: sortedQuestions[0]?.questionId,
      }] as unknown as any,
    },
  });

  return {
    interviewId: updatedInterview.interview_id,
    status: updatedInterview.status as AIInterviewStatus,
    currentQuestion: sortedQuestions[0],
    progress: {
      questionsAsked: 1,
      totalQuestions: sortedQuestions.length,
    },
    startedAt: updatedInterview.started_at || undefined,
  };
};

/**
 * Submit a response to a question
 */
export const submitResponse = async (params: SubmitResponseParams): Promise<InterviewSessionResponse> => {
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: params.interviewId },
    include: {
      application: {
        include: { job: true },
      },
    },
  });

  if (!interview) {
    throw new Error('Interview not found');
  }

  if (interview.candidate_id !== params.candidateId) {
    throw new Error('Unauthorized access to interview');
  }

  if (interview.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot submit response. Interview status: ${interview.status}`);
  }

  const questions = (interview.questions_asked as unknown as InterviewQuestion[]) || [];
  const responses = (interview.responses as unknown as CandidateResponse[]) || [];
  const transcript = (interview.transcript as unknown as TranscriptEntry[]) || [];

  // Find the current question
  const currentQuestion = questions.find(q => q.questionId === params.questionId);
  if (!currentQuestion) {
    throw new Error('Question not found');
  }

  const job = interview.application?.job;

  // Analyze the response
  const analysis = await analyzeResponse({
    question: currentQuestion,
    response: params.responseText,
    jobContext: {
      jobTitle: job?.title || 'General Position',
      requiredSkills: (job?.required_skills as string[]) || [],
    },
  });

  // Create response object (use ISO string for JSON serialization)
  const candidateResponse = {
    questionId: params.questionId,
    responseText: params.responseText,
    duration: params.responseDuration,
    timestamp: new Date().toISOString(),
    analysis: analysis,
  };

  // Add to transcript
  const newTranscriptEntries: Array<{
    role: 'ai' | 'candidate';
    content: string;
    timestamp: string;
    questionId?: string;
    responseId?: string;
  }> = [
    {
      role: 'candidate',
      content: params.responseText,
      timestamp: new Date().toISOString(),
      responseId: params.questionId,
    },
  ];

  // Determine next question (sort by order first)
  const answeredQuestionIds = [...responses.map(r => r.questionId), params.questionId];
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const nextQuestion = sortedQuestions.find(q => !answeredQuestionIds.includes(q.questionId));

  // Add next question to transcript if exists
  if (nextQuestion) {
    newTranscriptEntries.push({
      role: 'ai',
      content: nextQuestion.questionText,
      timestamp: new Date().toISOString(),
      questionId: nextQuestion.questionId,
    });
  }

  // Update interview
  const updatedInterview = await prisma.aIInterviewResult.update({
    where: { interview_id: params.interviewId },
    data: {
      responses: [...responses, candidateResponse] as unknown as any,
      transcript: [...transcript, ...newTranscriptEntries] as unknown as any,
    },
  });

  const updatedResponses = updatedInterview.responses as unknown as CandidateResponse[];

  return {
    interviewId: updatedInterview.interview_id,
    status: updatedInterview.status as AIInterviewStatus,
    currentQuestion: nextQuestion,
    progress: {
      questionsAsked: updatedResponses.length + (nextQuestion ? 1 : 0),
      totalQuestions: questions.length,
    },
    startedAt: updatedInterview.started_at || undefined,
  };
};

/**
 * End the interview and generate final evaluation
 */
export const endInterview = async (params: EndInterviewParams): Promise<InterviewDetailedResult> => {
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: params.interviewId },
    include: {
      application: {
        include: { job: true },
      },
    },
  });

  if (!interview) {
    throw new Error('Interview not found');
  }

  if (interview.candidate_id !== params.candidateId) {
    throw new Error('Unauthorized access to interview');
  }

  if (interview.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot end interview. Current status: ${interview.status}`);
  }

  const questions = (interview.questions_asked as unknown as InterviewQuestion[]) || [];
  const responses = (interview.responses as unknown as CandidateResponse[]) || [];
  const transcript = (interview.transcript as unknown as TranscriptEntry[]) || [];
  const job = interview.application?.job;

  // Calculate duration
  const startedAt = interview.started_at || new Date();
  const completedAt = new Date();
  const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

  // Analyze soft skills
  const softSkills = await analyzeSoftSkills(transcript, responses);

  // Compile sentiment analysis from responses
  const sentiment = compileSentimentAnalysis(responses);

  // Generate final evaluation
  const evaluation = await generateFinalEvaluation({
    questions,
    responses,
    softSkills,
    sentiment,
    jobContext: {
      jobTitle: job?.title || 'General Position',
      requiredSkills: (job?.required_skills as string[]) || [],
      jobDescription: job?.description || undefined,
    },
  });

  // Update interview with final results
  const updatedInterview = await prisma.aIInterviewResult.update({
    where: { interview_id: params.interviewId },
    data: {
      status: 'COMPLETED',
      completed_at: completedAt,
      duration_seconds: durationSeconds,
      soft_skills: softSkills as any,
      sentiment_analysis: sentiment as any,
      qualification: evaluation.qualification,
      score: evaluation.overallScore.toString(),
      feedback: evaluation.recommendation,
      // Save full evaluation details (fitScore, strengths, etc.)
      evaluation_details: {
        fitScore: evaluation.fitScore,
        strengths: evaluation.strengths,
        areasForImprovement: evaluation.areasForImprovement,
        redFlags: evaluation.redFlags,
        confidenceInAssessment: evaluation.confidenceInAssessment,
      } as any,
    },
  });

  return {
    interviewId: updatedInterview.interview_id,
    status: updatedInterview.status as AIInterviewStatus,
    qualification: updatedInterview.qualification as AIQualification,
    duration: durationSeconds,
    completedAt,
    overallScore: evaluation.overallScore,
    softSkills,
    sentiment,
    evaluation,
    transcript,
    questions,
    responses,
  };
};

/**
 * Get interview by ID (for candidates - limited info)
 */
export const getInterviewForCandidate = async (interviewId: string, candidateId: string): Promise<CandidateInterviewListItem> => {
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: interviewId },
    include: {
      application: {
        include: {
          job: {
            include: {
              company: true,
            },
          },
        },
      },
    },
  });

  if (!interview) {
    throw new Error('Interview not found');
  }

  if (interview.candidate_id !== candidateId) {
    throw new Error('Unauthorized access to interview');
  }

  // Return limited info for candidates (no scores or detailed analysis)
  return {
    interviewId: interview.interview_id,
    status: interview.status as AIInterviewStatus,
    interviewType: interview.interview_type,
    scheduledDate: interview.scheduled_date || undefined,
    jobTitle: interview.application?.job?.title || 'Unknown Position',
    companyName: interview.application?.job?.company?.full_name || undefined,
    createdAt: interview.created_at,
    startedAt: interview.started_at || undefined,
    completedAt: interview.completed_at || undefined,
  };
};

/**
 * Get full interview details (for admins/recruiters only)
 */
export const getInterviewDetails = async (interviewId: string): Promise<InterviewDetailedResult | null> => {
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: interviewId },
  });

  if (!interview) {
    return null;
  }

  // Get stored evaluation details or use defaults
  const evalDetails = (interview as any).evaluation_details as {
    fitScore?: number;
    strengths?: string[];
    areasForImprovement?: string[];
    redFlags?: string[];
    confidenceInAssessment?: string;
  } | null;

  return {
    interviewId: interview.interview_id,
    status: interview.status as AIInterviewStatus,
    qualification: interview.qualification as AIQualification | undefined,
    duration: interview.duration_seconds || undefined,
    completedAt: interview.completed_at || undefined,
    overallScore: parseInt(interview.score || '0'),
    softSkills: interview.soft_skills as unknown as SoftSkillsAnalysis,
    sentiment: interview.sentiment_analysis as unknown as SentimentAnalysis,
    evaluation: {
      qualification: interview.qualification as AIQualification,
      overallScore: parseInt(interview.score || '0'),
      recommendation: interview.feedback || '',
      strengths: evalDetails?.strengths || [],
      areasForImprovement: evalDetails?.areasForImprovement || [],
      fitScore: evalDetails?.fitScore || 0,
      redFlags: evalDetails?.redFlags || [],
      confidenceInAssessment: (evalDetails?.confidenceInAssessment as 'low' | 'medium' | 'high') || 'medium',
    },
    transcript: interview.transcript as unknown as TranscriptEntry[],
    questions: interview.questions_asked as unknown as InterviewQuestion[],
    responses: interview.responses as unknown as CandidateResponse[],
  };
};

// ==================== AI Functions ====================

/**
 * Generate interview questions using AI (with custom JSON handling for arrays)
 */
export const generateInterviewQuestions = async (params: GenerateQuestionsParams): Promise<InterviewQuestion[]> => {
  const prompt = AI_INTERVIEW_PROMPTS.GENERATE_INTERVIEW_QUESTIONS
    .replace('{questionCount}', params.questionCount.toString())
    .replace('{interviewType}', params.interviewType)
    .replace('{jobTitle}', params.jobTitle)
    .replace('{requiredSkills}', params.requiredSkills.join(', '))
    .replace('{experienceLevel}', params.experienceLevel)
    .replace('{jobDescription}', params.jobDescription || 'N/A')
    .replace('{candidateSkills}', params.candidateProfile?.skills.join(', ') || 'N/A')
    .replace('{candidateExperience}', params.candidateProfile?.experience.join(', ') || 'N/A');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.95,
      maxOutputTokens: 4096,
    }
  });

  const fullPrompt = `You are an expert HR interviewer AI.\n\n${prompt}\n\nCRITICAL: Return ONLY valid JSON array. No explanations, no markdown, no code blocks. Start with [ and end with ].`;

  const result = await model.generateContent(fullPrompt);
  let text = result.response.text().trim();

  // Remove markdown
  if (text.startsWith('```json')) {
    text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/```[a-z]*\s*/, '').replace(/\s*```$/, '');
  }

  // Extract JSON (array or object)
  const firstBracket = text.indexOf('[');
  const firstBrace = text.indexOf('{');

  if (firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)) {
    // It's an array, extract it
    const lastBracket = text.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      text = text.substring(firstBracket, lastBracket + 1);
    }
  } else if (firstBrace !== -1) {
    // It's object(s), need to wrap in array
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);

      // Check if multiple objects (contains },{)
      if (text.includes('},{')) {
        console.log('🔧 Wrapping multiple objects in array brackets');
        text = '[' + text + ']';
      } else {
        // Single object, wrap it
        console.log('🔧 Wrapping single object in array brackets');
        text = '[' + text + ']';
      }
    }
  }

  try {
    const questions = JSON.parse(text);
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error('Failed to parse interview questions:', error);
    console.error('Text:', text.substring(0, 500));
    return [];
  }
};

/**
 * Analyze a candidate's response using AI
 */
export const analyzeResponse = async (params: AnalyzeResponseParams): Promise<ResponseAnalysis> => {
  const prompt = AI_INTERVIEW_PROMPTS.ANALYZE_RESPONSE
    .replace('{question}', params.question.questionText)
    .replace('{questionType}', params.question.type)
    .replace('{category}', params.question.category)
    .replace('{expectedTopics}', params.question.expectedTopics?.join(', ') || 'N/A')
    .replace('{response}', params.response)
    .replace('{jobTitle}', params.jobContext.jobTitle)
    .replace('{requiredSkills}', params.jobContext.requiredSkills.join(', '));

  const analysis = await generateGeminiJSON(
    'You are an expert interview evaluator AI.',
    prompt
  );

  return {
    relevanceScore: analysis.relevanceScore || 0,
    completenessScore: analysis.completenessScore || 0,
    clarityScore: analysis.clarityScore || 0,
    topicsCovered: analysis.topicsCovered || [],
    keyPoints: analysis.keyPoints || [],
    concerns: analysis.concerns || [],
    strengths: analysis.strengths || [],
  };
};

/**
 * Generate a follow-up question using AI
 */
export const generateFollowUp = async (params: GenerateFollowUpParams): Promise<InterviewQuestion | null> => {
  const prompt = AI_INTERVIEW_PROMPTS.GENERATE_FOLLOWUP
    .replace('{originalQuestion}', params.originalQuestion.questionText)
    .replace('{response}', params.response)
    .replace('{topicsCovered}', params.analysis.topicsCovered.join(', '))
    .replace('{topicsMissing}', (params.originalQuestion.expectedTopics || [])
      .filter(t => !params.analysis.topicsCovered.includes(t))
      .join(', ') || 'None')
    .replace('{keyPoints}', params.analysis.keyPoints.join(', '))
    .replace('{concerns}', params.analysis.concerns.join(', ') || 'None')
    .replace('{originalCategory}', params.originalQuestion.category)
    .replace('{originalQuestionId}', params.originalQuestion.questionId);

  try {
    const followUp = await generateGeminiJSON(
      'You are an expert HR interviewer AI.',
      prompt
    );
    return followUp;
  } catch (error) {
    console.error('Failed to generate follow-up:', error);
    return null;
  }
};

/**
 * Analyze soft skills from transcript
 */
export const analyzeSoftSkills = async (
  transcript: TranscriptEntry[],
  responses: CandidateResponse[]
): Promise<SoftSkillsAnalysis> => {
  const responseSummaries = responses.map(r => ({
    question: r.questionId,
    keyPoints: r.analysis?.keyPoints || [],
    strengths: r.analysis?.strengths || [],
  }));

  const prompt = AI_INTERVIEW_PROMPTS.ANALYZE_SOFT_SKILLS
    .replace('{transcript}', JSON.stringify(transcript.slice(-20))) // Last 20 entries
    .replace('{questionsCount}', responses.length.toString())
    .replace('{responseSummaries}', JSON.stringify(responseSummaries));

  console.log('🔍 Analyzing soft skills...');
  const analysis = await generateInterviewAnalysisJSON(
    'You are an expert behavioral psychologist AI.',
    prompt
  );
  console.log('✅ Soft skills analysis complete');

  return {
    communication: analysis.communication || { skill: 'communication', score: 50, evidence: [], confidence: 'low' },
    problemSolving: analysis.problemSolving || { skill: 'problemSolving', score: 50, evidence: [], confidence: 'low' },
    leadership: analysis.leadership || { skill: 'leadership', score: 50, evidence: [], confidence: 'low' },
    teamwork: analysis.teamwork || { skill: 'teamwork', score: 50, evidence: [], confidence: 'low' },
    adaptability: analysis.adaptability || { skill: 'adaptability', score: 50, evidence: [], confidence: 'low' },
    criticalThinking: analysis.criticalThinking || { skill: 'criticalThinking', score: 50, evidence: [], confidence: 'low' },
    overall: analysis.overall || 50,
  };
};

/**
 * Compile sentiment analysis from all responses
 */
const compileSentimentAnalysis = (responses: CandidateResponse[]): SentimentAnalysis => {
  const perResponse = responses.map(r => {
    const sentiment = (r.analysis as any)?.sentiment || {};
    return {
      questionId: r.questionId,
      confidence: sentiment.confidence || 'medium',
      tone: sentiment.tone || 'neutral',
      engagement: sentiment.engagement || 'moderately_engaged',
      clarity: sentiment.clarity || 'somewhat_clear',
      notes: sentiment.notes,
    };
  });

  // Calculate overall sentiment (most common values)
  const confidences = perResponse.map(p => p.confidence);
  const tones = perResponse.map(p => p.tone);
  const engagements = perResponse.map(p => p.engagement);

  // Generate summary
  const overallConfidence = getMostCommon(confidences) || 'medium';
  const overallTone = getMostCommon(tones) || 'neutral';
  const overallEngagement = getMostCommon(engagements) || 'moderately_engaged';

  const summary = `The candidate displayed ${overallConfidence} confidence throughout the interview with a ${overallTone} tone. Their engagement level was ${overallEngagement.replace('_', ' ')}.`;

  return {
    overall: {
      confidence: overallConfidence,
      tone: overallTone,
      engagement: overallEngagement,
      consistency: 'consistent', // Could be calculated based on variance
    },
    perResponse,
    summary,
  };
};

/**
 * Generate final evaluation using AI
 */
export const generateFinalEvaluation = async (params: FinalEvaluationParams): Promise<FinalEvaluation> => {
  const questionsAndResponses = params.questions.map(q => {
    const response = params.responses.find(r => r.questionId === q.questionId);
    return {
      question: q.questionText,
      response: response?.responseText || 'No response',
      analysis: response?.analysis,
    };
  });

  const durationMinutes = params.responses.reduce((sum, r) => sum + r.duration, 0) / 60;

  const prompt = AI_INTERVIEW_PROMPTS.FINAL_EVALUATION
    .replace('{jobTitle}', params.jobContext.jobTitle)
    .replace('{requiredSkills}', params.jobContext.requiredSkills.join(', '))
    .replace('{jobDescription}', params.jobContext.jobDescription || 'N/A')
    .replace('{totalQuestions}', params.questions.length.toString())
    .replace('{durationMinutes}', durationMinutes.toFixed(1))
    .replace('{questionsAndResponses}', JSON.stringify(questionsAndResponses))
    .replace('{softSkillsAnalysis}', JSON.stringify(params.softSkills))
    .replace('{sentimentAnalysis}', JSON.stringify(params.sentiment));

  console.log('🎯 Generating final evaluation...');
  const evaluation = await generateInterviewAnalysisJSON(
    'You are an expert HR evaluation AI.',
    prompt
  );
  console.log('✅ Final evaluation complete');

  return {
    qualification: evaluation.qualification || 'PENDING_REVIEW',
    overallScore: evaluation.overallScore || 0,
    recommendation: evaluation.recommendation || 'Unable to generate recommendation',
    strengths: evaluation.strengths || [],
    areasForImprovement: evaluation.areasForImprovement || [],
    fitScore: evaluation.fitScore || 0,
    redFlags: evaluation.redFlags || [],
    confidenceInAssessment: evaluation.confidenceInAssessment || 'low',
  };
};

// ==================== Interview Expiration & Abandonment ====================

/**
 * Expiration window in hours (48 hours after scheduled date)
 */
const INTERVIEW_EXPIRATION_HOURS = 48;

/**
 * Abandonment window in hours (24 hours after started_at)
 * If an interview is IN_PROGRESS for longer than this, mark as FAILED
 */
const INTERVIEW_ABANDONMENT_HOURS = 24;

/**
 * Check if a single interview is expired based on scheduled_date + expiration window
 */
export const isInterviewExpired = (scheduledDate: Date | null | undefined): boolean => {
  if (!scheduledDate) return false;

  const expirationTime = new Date(scheduledDate);
  // Use milliseconds to properly handle fractional hours (setHours truncates decimals)
  const expirationMs = INTERVIEW_EXPIRATION_HOURS * 60 * 60 * 1000;
  expirationTime.setTime(expirationTime.getTime() + expirationMs);

  return new Date() > expirationTime;
};

/**
 * Check if an IN_PROGRESS interview is abandoned based on started_at + abandonment window
 */
export const isInterviewAbandoned = (startedAt: Date | null | undefined): boolean => {
  if (!startedAt) return false;

  const abandonmentTime = new Date(startedAt);
  // Use milliseconds for consistency and to handle fractional hours properly
  const abandonmentMs = INTERVIEW_ABANDONMENT_HOURS * 60 * 60 * 1000;
  abandonmentTime.setTime(abandonmentTime.getTime() + abandonmentMs);

  return new Date() > abandonmentTime;
};

/**
 * Check and mark all expired interviews as EXPIRED
 * Called by scheduler (runs every hour) and lazily on API requests
 */
export const checkAndExpireInterviews = async (): Promise<{ expiredCount: number }> => {
  const now = new Date();
  const cutoffDate = new Date(now);
  // Use milliseconds to properly handle fractional hours
  const expirationMs = INTERVIEW_EXPIRATION_HOURS * 60 * 60 * 1000;
  cutoffDate.setTime(cutoffDate.getTime() - expirationMs);

  // Find all PENDING interviews where scheduled_date + 48h has passed
  const expiredInterviews = await prisma.aIInterviewResult.updateMany({
    where: {
      status: 'PENDING',
      scheduled_date: {
        lt: cutoffDate, // scheduled_date is more than 48h ago
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (expiredInterviews.count > 0) {
    console.log(`⏰ Marked ${expiredInterviews.count} interview(s) as EXPIRED`);
  }

  return { expiredCount: expiredInterviews.count };
};

/**
 * Check and mark all abandoned IN_PROGRESS interviews as FAILED
 * Called by scheduler (runs every hour)
 */
export const checkAndFailAbandonedInterviews = async (): Promise<{ failedCount: number }> => {
  const now = new Date();
  const cutoffDate = new Date(now);
  // Use milliseconds for consistency
  const abandonmentMs = INTERVIEW_ABANDONMENT_HOURS * 60 * 60 * 1000;
  cutoffDate.setTime(cutoffDate.getTime() - abandonmentMs);

  // Find all IN_PROGRESS interviews where started_at + 24h has passed
  const abandonedInterviews = await prisma.aIInterviewResult.updateMany({
    where: {
      status: 'IN_PROGRESS',
      started_at: {
        lt: cutoffDate, // started_at is more than 24h ago
      },
    },
    data: {
      status: 'FAILED',
    },
  });

  if (abandonedInterviews.count > 0) {
    console.log(`⏰ Marked ${abandonedInterviews.count} abandoned interview(s) as FAILED`);
  }

  return { failedCount: abandonedInterviews.count };
};

/**
 * Check if a specific interview is expired and update its status if needed
 * Returns true if the interview was/is expired
 */
export const checkAndExpireSingleInterview = async (interviewId: string): Promise<boolean> => {
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: interviewId },
    select: { status: true, scheduled_date: true },
  });

  if (!interview) return false;

  // Already expired or completed
  if (interview.status !== 'PENDING') {
    return interview.status === 'EXPIRED';
  }

  // Check if should expire
  if (isInterviewExpired(interview.scheduled_date)) {
    await prisma.aIInterviewResult.update({
      where: { interview_id: interviewId },
      data: { status: 'EXPIRED' },
    });
    console.log(`⏰ Interview ${interviewId} marked as EXPIRED (lazy check)`);
    return true;
  }

  return false;
};

// ==================== Utility Functions ====================

function getMostCommon<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;

  const counts = arr.reduce((acc, val) => {
    acc.set(val, (acc.get(val) || 0) + 1);
    return acc;
  }, new Map<T, number>());

  let maxCount = 0;
  let mostCommon: T | undefined;

  counts.forEach((count, val) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = val;
    }
  });

  return mostCommon;
}

// ==================== Video Upload Functions ====================

import { s3PutObject, s3SignedUrl } from '../../lib/s3';

interface UploadVideoParams {
  interviewId: string;
  candidateId: string;
  videoBuffer: Buffer;
  mimeType: string;
  fileSize: number;
}

/**
 * Upload interview video recording to S3/MinIO
 */
export const uploadInterviewVideo = async (params: UploadVideoParams): Promise<{ videoUrl: string }> => {
  const { interviewId, candidateId, videoBuffer, mimeType, fileSize } = params;

  // Verify interview exists and belongs to candidate
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: interviewId },
  });

  if (!interview) {
    throw new Error('Interview not found');
  }

  if (interview.candidate_id !== candidateId) {
    throw new Error('Unauthorized access to interview');
  }

  // Only allow upload for completed or in-progress interviews
  if (!['COMPLETED', 'IN_PROGRESS'].includes(interview.status)) {
    throw new Error(`Cannot upload video. Interview status: ${interview.status}`);
  }

  // Generate unique filename - always use .webm since that's what MediaRecorder produces
  // Browser may send wrong MIME type (text/plain), so force correct type
  const timestamp = Date.now();
  const key = `interviews/${interviewId}/recording_${timestamp}.webm`;
  const correctMimeType = 'video/webm';

  console.log(`📤 Uploading video to S3: ${key} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

  // Upload to S3/MinIO with correct content type
  await s3PutObject(key, videoBuffer, correctMimeType);

  // Update interview with video URL
  await prisma.aIInterviewResult.update({
    where: { interview_id: interviewId },
    data: { video_url: key },
  });

  console.log(`✅ Video uploaded successfully: ${key}`);

  return { videoUrl: key };
};

/**
 * Get signed URL for video playback (recruiter access)
 */
export const getInterviewVideoUrl = async (interviewId: string): Promise<{ signedUrl: string; expiresIn: number }> => {
  const interview = await prisma.aIInterviewResult.findUnique({
    where: { interview_id: interviewId },
    select: { video_url: true },
  });

  if (!interview) {
    throw new Error('Interview not found');
  }

  if (!interview.video_url) {
    throw new Error('No video recording available');
  }

  // Generate signed URL (10 minutes TTL)
  const expiresIn = 600; // seconds
  const signedUrl = await s3SignedUrl(interview.video_url, expiresIn);

  return { signedUrl, expiresIn };
};
