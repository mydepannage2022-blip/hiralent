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
    // Fetch assessment
    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
    });
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'PENDING') {
      throw new Error('Assessment is not active');
    }
    const questions = assessment.questions as Question[];
    const idx = assessment.current_question;
    if (!questions || idx >= questions.length) {
      // No more questions
      return null as any;
    }
    // TODO: Adaptive logic (adjust difficulty based on previous answers)
    const q = questions[idx];
    return {
      questionId: q.questionId || `q${idx + 1}`,
      questionText: q.questionText,
      type: q.type,
      options: q.options || [],
      difficulty: q.difficulty,
      timeLimit: q.timeLimit || 90,
      aiGenerated: true,
      adaptedReason: '', // TODO: Add reason if adaptive
    };
  }

  // Submit and evaluate an answer
  async submitAnswer(params: { assessmentId: string; questionId: string; answer: string; timeTaken: number }): Promise<any> {
    const { assessmentId, questionId, answer, timeTaken } = params;
    // Fetch assessment
    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
    });
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'PENDING') {
      throw new Error('Assessment is not active');
    }
    const questions = assessment.questions as Question[];
    const idx = assessment.current_question;
    if (!questions || idx >= questions.length) {
      throw new Error('No more questions');
    }
    const currentQ = questions[idx];
    if (currentQ.questionId !== questionId && `q${idx + 1}` !== questionId) {
      throw new Error('Invalid questionId or out of sequence');
    }
    // Evaluate answer with AI
    const aiEval = await this.ai.evaluateAnswer({
      question: currentQ.questionText,
      userAnswer: answer,
      expectedAnswer: currentQ.correctAnswer,
      questionType: currentQ.type,
      skillCategory: assessment.skill_category,
    });
    // Store answer in answers array
    const answers = Array.isArray(assessment.answers) ? [...assessment.answers] : [];
    answers.push({
      questionId,
      userAnswer: answer,
      timeTaken,
      aiEvaluation: aiEval,
      answeredAt: new Date().toISOString(),
    });
    // Update assessment: increment current_question, update answers
    const updated = await prisma.skillAssessment.update({
      where: { assessment_id: assessmentId },
      data: {
        answers,
        current_question: idx + 1,
        status: idx + 1 >= questions.length ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });
    // Prepare next question or signal completion
    const nextQ = questions[idx + 1];
    return {
      success: true,
      data: {
        isCorrect: aiEval.isCorrect,
        score: aiEval.score,
        feedback: aiEval.feedback,
        nextQuestion: nextQ
          ? {
              questionId: nextQ.questionId || `q${idx + 2}`,
              questionText: nextQ.questionText,
              type: nextQ.type,
              timeLimit: nextQ.timeLimit || 90,
            }
          : null,
        completed: !nextQ,
      },
    };
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