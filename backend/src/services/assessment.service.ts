import { PrismaClient } from '@prisma/client';
import { AIAssessmentService } from './aiAssessment.service';
import {
  StartAssessmentParams,
  Question,
  AnswerEvaluationParams,
  AssessmentResult,
  AssessmentHistory,
  AssessmentType,
  DifficultyLevel,
  QuestionType,
} from '../types/assessment.types';

const prisma = new PrismaClient();

export class AssessmentService {
  private ai: AIAssessmentService;

  constructor(aiService?: AIAssessmentService) {
    this.ai = aiService || new AIAssessmentService();
  }

  // Start a new assessment
  async startAssessment(params: StartAssessmentParams): Promise<any> {
    // Validate params (assume already validated by controller)
    const { candidateId, skillCategory, assessmentType, difficulty } = params;

    // Fetch candidate profile for context
    const candidateProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
    });
    if (!candidateProfile) {
      throw new Error('Candidate profile not found');
    }

    // Prepare context for AI
    const aiProfile = {
      experienceLevel: candidateProfile.experience || '',
      existingSkills: candidateProfile.skills ? candidateProfile.skills.split(',').map(s => s.trim()) : [],
      industry: '', // TODO: Add industry if available in profile
    };

    // Generate questions using AI
    const questionCount = 20; // Default, or adjust per assessmentType
    const questions = await this.ai.generateQuestions({
      skillCategory,
      difficulty,
      questionCount,
      candidateProfile: aiProfile,
    });

    // Create SkillAssessment record
    const assessment = await prisma.skillAssessment.create({
      data: {
        candidate_id: candidateId,
        assessment_type: assessmentType,
        skill_category: skillCategory,
        difficulty,
        total_questions: questionCount,
        time_limit: 30, // minutes, can be made configurable
        status: 'PENDING',
        current_question: 0,
        questions: questions,
        answers: [],
      },
    });

    // Prepare first question for response
    const firstQuestion = questions[0] ? {
      questionId: questions[0].questionId || 'q1',
      questionText: questions[0].questionText,
      type: questions[0].type,
      options: questions[0].options || [],
      timeLimit: questions[0].timeLimit || 90,
    } : null;

    return {
      success: true,
      data: {
        assessmentId: assessment.assessment_id,
        totalQuestions: assessment.total_questions,
        timeLimit: assessment.time_limit,
        status: assessment.status,
        firstQuestion,
      },
    };
  }

  // Get the next (adaptive) question
  async getNextQuestion(assessmentId: string): Promise<Question> {
    // TODO: Fetch assessment, determine next question, possibly adjust difficulty
    return null as any;
  }

  // Submit and evaluate an answer
  async submitAnswer(params: any): Promise<any> {
    // TODO: Store answer, evaluate via AI, update assessment progress, return feedback and next question
    return null;
  }

  // Complete the assessment
  async completeAssessment(assessmentId: string): Promise<any> {
    // TODO: Mark assessment as completed, generate AI report, update DB
    return null;
  }

  // Get assessment results
  async getAssessmentResults(assessmentId: string): Promise<any> {
    // TODO: Fetch assessment, results, and AI analysis
    return null;
  }

  // Get assessment history for a candidate
  async getAssessmentHistory(candidateId: string): Promise<AssessmentHistory> {
    // TODO: Fetch all assessments for candidate, calculate progress
    return null as any;
  }
}