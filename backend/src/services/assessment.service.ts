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
    // Fetch assessment
    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
    });
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    if (assessment.status === 'COMPLETED') {
      return { success: true, data: { assessmentId, status: 'COMPLETED' } };
    }
    // Generate AI report
    const results = Array.isArray(assessment.answers) ? assessment.answers : [];
    const report = await this.ai.generateReport({
      assessment,
      results,
      totalTime: null, // TODO: Calculate if needed
    });
    // Update assessment with report
    const updated = await prisma.skillAssessment.update({
      where: { assessment_id: assessmentId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        overall_score: report?.overallScore || null,
        skill_level_result: report?.skillLevel || null,
        strengths: report?.strengths || [],
        weaknesses: report?.weaknesses || [],
        recommendations: report?.recommendations || [],
        ai_analysis: report || {},
        confidence_score: report?.confidenceScore || null,
      },
    });
    return {
      success: true,
      data: {
        assessmentId: updated.assessment_id,
        status: updated.status,
        overallScore: updated.overall_score,
        skillLevel: updated.skill_level_result,
        completedAt: updated.completed_at,
        nextSteps: {
          jobMatching: '/api/v1/candidates/match-jobs',
          detailedResults: `/api/v1/candidates/assessment/${updated.assessment_id}/results`,
        },
      },
    };
  }

  // Get assessment results
  async getAssessmentResults(assessmentId: string): Promise<any> {
    // Fetch assessment
    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
    });
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    const questions = assessment.questions as Question[];
    const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
    const aiAnalysis = assessment.ai_analysis || {};
    // Build question breakdown
    const questionBreakdown = answers.map((a: any, idx: number) => ({
      questionId: a.questionId || `q${idx + 1}`,
      score: a.aiEvaluation?.score || 0,
      difficulty: questions[idx]?.difficulty || 'BEGINNER',
      timeTaken: a.timeTaken,
      feedback: a.aiEvaluation?.feedback || '',
    }));
    return {
      success: true,
      data: {
        assessmentId: assessment.assessment_id,
        skillCategory: assessment.skill_category,
        overallScore: assessment.overall_score,
        skillLevel: assessment.skill_level_result,
        strengths: assessment.strengths || [],
        weaknesses: assessment.weaknesses || [],
        recommendations: assessment.recommendations || [],
        questionBreakdown,
        aiAnalysis,
      },
    };
  }

  // Get assessment history for a candidate
  async getAssessmentHistory(candidateId: string): Promise<any> {
    // Fetch all assessments for candidate
    const assessments = await prisma.skillAssessment.findMany({
      where: { candidate_id: candidateId, status: 'COMPLETED' },
      orderBy: { completed_at: 'desc' },
    });
    // Build history array
    const history = assessments.map((a, idx) => {
      let improvement = undefined;
      if (idx < assessments.length - 1) {
        const diff = (a.overall_score || 0) - (assessments[idx + 1].overall_score || 0);
        improvement = diff > 0 ? `+${diff} points from last attempt` : `${diff} points from last attempt`;
      }
      return {
        assessmentId: a.assessment_id,
        skillCategory: a.skill_category,
        overallScore: a.overall_score,
        skillLevel: a.skill_level_result,
        completedAt: a.completed_at,
        improvement,
      };
    });
    // Build skillProgress
    const skillProgress: Record<string, any> = {};
    for (const a of assessments) {
      const cat = a.skill_category;
      if (!skillProgress[cat]) {
        skillProgress[cat] = {
          currentLevel: a.skill_level_result,
          trend: 'STABLE',
          lastScore: a.overall_score,
          previousScore: undefined,
        };
      } else {
        skillProgress[cat].previousScore = a.overall_score;
        skillProgress[cat].trend = (a.overall_score || 0) > (skillProgress[cat].lastScore || 0) ? 'IMPROVING' : 'DECLINING';
      }
    }
    return {
      success: true,
      data: {
        assessments: history,
        skillProgress,
      },
    };
  }

  // Get assessment progress
  async getProgress(assessmentId: string): Promise<any> {
    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
    });
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    const totalQuestions = assessment.total_questions;
    const currentQuestion = assessment.current_question;
    const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
    const progressPercentage = Math.round((currentQuestion / totalQuestions) * 100);
    // Calculate current score (average of answered)
    const scores = answers.map((a: any) => a.aiEvaluation?.score || 0);
    const currentScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    // Time remaining (if startedAt and timeLimit)
    let timeRemaining = null;
    if (assessment.started_at && assessment.time_limit) {
      const elapsed = (Date.now() - new Date(assessment.started_at).getTime()) / 1000; // seconds
      timeRemaining = Math.max(0, assessment.time_limit * 60 - elapsed);
    }
    // Difficulty curve (array of difficulties so far)
    const questions = assessment.questions as Question[];
    const difficultyCurve = questions.slice(0, currentQuestion).map(q => q.difficulty || 'BEGINNER');
    return {
      success: true,
      data: {
        assessmentId: assessment.assessment_id,
        currentQuestion,
        totalQuestions,
        progressPercentage,
        currentScore,
        timeRemaining,
        difficultyCurve,
      },
    };
  }

  async getRecommendations(candidateId: string): Promise<any> {
    // TODO: In future, use AI or business logic for personalized recommendations
    return {
      success: true,
      data: {
        recommendations: [
          {
            skillCategory: 'React',
            reason: 'High demand in your job preferences',
            difficulty: 'INTERMEDIATE',
            estimatedTime: '2-3 weeks',
            marketValue: '15% salary increase potential',
          },
        ],
        learningPath: [
          {
            step: 1,
            skill: 'Advanced JavaScript',
            duration: '1 week',
            resources: ['MDN Documentation', "You Don't Know JS"],
          },
        ],
      },
    };
  }
}