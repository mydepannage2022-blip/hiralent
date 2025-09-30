import { Json } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/db_control';
import prisma from '../../lib/prisma';
import {
  StartAssessmentParams,
  Question,
} from '../../types/assessment.types';
import * as aiAssessment from './aiAssessment.service';
import { QuestionType} from '../../types/assessment.types';


export const startAssessment = async (params: StartAssessmentParams): Promise<any> => {
  try {
    const { candidateId, skillCategory, assessmentType, difficulty } = params;
    console.log('Starting assessment with params:', params);
    // Get candidate profile WITH skills (populated)
    let candidateWithProfile;
    try {
      candidateWithProfile = await prisma.user.findUnique({
        where: { user_id: candidateId },
        include: {
          candidateProfile: true,
          candidateSkills: true // Get actual skills instead of IDs
        }
      });
    } catch (dbError: any) {
      console.error('Database error in startAssessment:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    if (!candidateWithProfile?.candidateProfile) {
      throw new Error('Candidate profile not found. Please complete your profile first.');
    }

    const candidateProfile = candidateWithProfile.candidateProfile;
    const candidateSkills = candidateWithProfile.candidateSkills;
    
    // Build AI profile with actual skills data
    const aiProfile = {
      experienceLevel: candidateProfile.experience || '',
      // Use actual skill names from CandidateSkill table instead of JSON parsing
      existingSkills: candidateSkills.map(skill => skill.skill_name),
      industry: '',
    };
    
    const questionCount = 5;
    let questions;
    
    try {
      questions = await aiAssessment.generateQuestions({
        skillCategory,
        difficulty,
        questionCount,
        candidateProfile: aiProfile,
      });
    } catch (aiError: any) {
      console.error('AI service error in startAssessment:', aiError);
      
      // Fallback: Use basic questions if AI fails
      questions = getFallbackQuestions(skillCategory, difficulty, questionCount);
      console.warn(`Using fallback questions for ${skillCategory} due to AI service failure`);
    }
    
    if (!questions || questions.length === 0) {
      throw new Error(`Unable to generate questions for ${skillCategory}. Please try a different skill category.`);
    }
    
    let assessment;
    try {
      assessment = await prisma.skillAssessment.create({
        data: {
          candidate_id: candidateId,
          assessment_type: assessmentType,
          provider: "AI_GEMINI",
          skill_category: skillCategory,
          difficulty: difficulty,
          total_questions: questionCount,
          time_limit: 30,
          status: 'PENDING',
          current_question: 0,
          questions: questions as Json,
          answers: [] as Json,
          started_at: new Date(), // Add started_at for time tracking
        } as any,
      });
    } catch (dbError: any) {
      console.error('Database error creating assessment:', dbError);
      throw new Error('Failed to create assessment. Please try again.');
    }
    
    const firstQuestion = questions[0] ? {
    questionId: questions[0].questionId || 'q1',
    questionText: questions[0].questionText,
    type: questions[0].type,
    options: questions[0].options?.map((opt: string, idx: number) => ({
      id: `opt-${idx + 1}`,
      text: opt
    })) || [],
    timeLimit: questions[0].timeLimit || 90,
    difficulty: questions[0].difficulty || difficulty,
  } : null;
    
   return {
    success: true,
    data: {
      assessmentId: assessment.assessment_id,
      skillCategory: assessment.skill_category,      
      assessmentType: assessment.assessment_type,    
      totalQuestions: assessment.total_questions,
      timeLimit: assessment.time_limit,
      status: assessment.status,
      firstQuestion,
    },
  };
    
  } catch (error: any) {
    console.error('Error in startAssessment:', error);
    throw new Error(error.message || 'Failed to start assessment. Please try again.');
  }
};

export const getNextQuestion = async (assessmentId: string): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error('Assessment ID is required');
    }
    
    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error('Database error in getNextQuestion:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'PENDING') {
      throw new Error(`Assessment is ${assessment.status.toLowerCase()}. Cannot get questions.`);
    }
    
    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];
      
    if (!questions || questions.length === 0) {
      throw new Error('No questions found for this assessment');
    }
    
    const idx = assessment.current_question;
    if (idx >= questions.length) {
      throw new Error('No more questions available. Assessment should be completed.');
    }
    
    const q = questions[idx];
    if (!q) {
      throw new Error('Question not found at current index');
    }
    
    // Update status to IN_PROGRESS if it was PENDING
    if (assessment.status === 'PENDING') {
      try {
        await prisma.skillAssessment.update({
          where: { assessment_id: assessmentId },
          data: { 
            status: 'IN_PROGRESS',
            started_at: new Date()
          },
        });
      } catch (dbError: any) {
        console.warn('Failed to update assessment status to IN_PROGRESS:', dbError);
      }
    }
    
    // ✅ Return proper format with nested structure
    return {
      success: true,
      data: {
        question: {
          questionId: q.questionId || `q${idx + 1}`,
          questionText: q.questionText,
          type: q.type,
          options: q.options || [],
          difficulty: q.difficulty,
          timeLimit: q.timeLimit || 90,
          aiGenerated: true,
          adaptedReason: '',
          category: assessment.skill_category,  
          correctAnswer: q.correctAnswer || '' // Optional
        },
        currentIndex: idx,
        totalQuestions: questions.length,
        hasNext: idx + 1 < questions.length
      }
    };
    
  } catch (error: any) {
    console.error('Error in getNextQuestion:', error);
    throw new Error(error.message || 'Failed to get next question');
  }
};

export const submitAnswer = async (params: { assessmentId: string; questionId: string; answer: string; timeTaken: number }): Promise<any> => {
  try {
    const { assessmentId, questionId, answer, timeTaken } = params;
    
    // Validate input
    if (!assessmentId || !questionId || answer === undefined || timeTaken < 0) {
      throw new Error('Missing or invalid required parameters');
    }
    
    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error('Database error in submitAnswer:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'PENDING') {
      throw new Error(`Cannot submit answer. Assessment is ${assessment.status.toLowerCase()}.`);
    }
    
    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];
      
    if (!questions || questions.length === 0) {
      throw new Error('No questions found for this assessment');
    }
    
    const idx = assessment.current_question;
    if (idx >= questions.length) {
      throw new Error('No more questions to answer');
    }
    
    const currentQ = questions[idx];
    if (!currentQ) {
      throw new Error('Current question not found');
    }
    
    // Validate question ID
    if (currentQ.questionId !== questionId && `q${idx + 1}` !== questionId) {
      throw new Error('Invalid question ID or answers submitted out of sequence');
    }
    
    // AI Evaluation with error handling
    let aiEval;
    try {
      aiEval = await aiAssessment.evaluateAnswer({
        question: currentQ.questionText,
        userAnswer: answer,
        expectedAnswer: currentQ.correctAnswer,
        questionType: currentQ.type,
        skillCategory: assessment.skill_category,
      });
    } catch (aiError: any) {
      console.error('AI evaluation error:', aiError);
      
      // Fallback: Basic evaluation if AI fails
      aiEval = getFallbackEvaluation(currentQ, answer);
      console.warn('Using fallback evaluation due to AI service failure');
    }
    
    const answers = Array.isArray(assessment.answers) ? [...(assessment.answers as any[])] : [];
    answers.push({
      questionId,
      userAnswer: answer,
      timeTaken,
      aiEvaluation: aiEval,
      answeredAt: new Date().toISOString(),
    });
    
    const isLastQuestion = idx + 1 >= questions.length;
    
    let updated;
    try {
      updated = await prisma.skillAssessment.update({
        where: { assessment_id: assessmentId },
        data: {
          answers: answers as any,
          current_question: idx + 1,
          status: isLastQuestion ? 'COMPLETED' : 'IN_PROGRESS',
        },
      });
    } catch (dbError: any) {
      console.error('Database error updating assessment:', dbError);
      throw new Error('Failed to save answer. Please try again.');
    }
    
    const nextQ = isLastQuestion ? null : questions[idx + 1];
    
    return {
      success: true,
      data: {
        isCorrect: aiEval.isCorrect,
        score: aiEval.score,
        feedback: aiEval.feedback,
        currentIndex: idx,  
        nextQuestion: nextQ
          ? {
              questionId: nextQ.questionId || `q${idx + 2}`,
              questionText: nextQ.questionText,
              type: nextQ.type,
              options: nextQ.options || [],  // ✅ Already exists
              timeLimit: nextQ.timeLimit || 90,
              difficulty: nextQ.difficulty || assessment.difficulty || 'INTERMEDIATE', 
            }
          : null,
        completed: isLastQuestion,
      },
    };
    
  } catch (error: any) {
    console.error('Error in submitAnswer:', error);
    throw new Error(error.message || 'Failed to submit answer');
  }
};

export const getProgress = async (assessmentId: string): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error('Assessment ID is required');
    }
    
    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error('Database error in getProgress:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    const totalQuestions = assessment.total_questions;
    const currentQuestion = assessment.current_question;
    const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
    
    const progressPercentage = Math.round((currentQuestion / totalQuestions) * 100);
    const scores = answers.map((a: any) => a.aiEvaluation?.score || 0);
    const currentScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    let timeRemaining = null;
    if (assessment.started_at && assessment.time_limit) {
      const elapsed = (Date.now() - new Date(assessment.started_at).getTime()) / 1000;
      timeRemaining = Math.max(0, assessment.time_limit * 60 - elapsed);
    }
    
    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];
    const difficultyCurve = questions.slice(0, currentQuestion).map(q => q.difficulty || 'BEGINNER');
    
    return {
      success: true,
      data: {
        assessmentId: assessment.assessment_id,
        currentQuestion: assessment.current_question,
        totalQuestions,
        progressPercentage,
        currentScore,
        timeRemaining,
        difficultyCurve,
      },
    };
    
  } catch (error: any) {
    console.error('Error in getProgress:', error);
    throw new Error(error.message || 'Failed to get progress');
  }
};

export const completeAssessment = async (assessmentId: string): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error('Assessment ID is required');
    }
    
    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error('Database error in completeAssessment:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    if (assessment.status === 'COMPLETED') {
      return { 
        success: true, 
        data: { 
          assessmentId: assessment.assessment_id, 
          status: 'COMPLETED',
          message: 'Assessment already completed'
        } 
      };
    }
    
    const results = Array.isArray(assessment.answers) ? assessment.answers : [];
    
    // Generate AI report with error handling
    let report;
    try {
      report = await aiAssessment.generateReport({
        assessment,
        results,
        totalTime: null,
      });
    } catch (aiError: any) {
      console.error('AI report generation error:', aiError);
      
      // Fallback: Generate basic report
      report = generateFallbackReport(assessment, results);
      console.warn('Using fallback report due to AI service failure');
    }
    
    let updated;
    try {
      updated = await prisma.skillAssessment.update({
        where: { assessment_id: assessmentId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          overall_score: report?.overallScore || calculateBasicScore(results),
          skill_level_result: report?.skillLevel || 'INTERMEDIATE',
          strengths: report?.strengths || ['Assessment completed'],
          weaknesses: report?.weaknesses || ['Review recommended'],
          recommendations: report?.recommendations || ['Continue practicing'],
          ai_analysis: report || {},
          confidence_score: report?.confidenceScore || 75,
        },
      });
    } catch (dbError: any) {
      console.error('Database error completing assessment:', dbError);
      throw new Error('Failed to complete assessment. Please try again.');
    }
    
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
    
  } catch (error: any) {
    console.error('Error in completeAssessment:', error);
    throw new Error(error.message || 'Failed to complete assessment');
  }
};

export const getAssessmentResults = async (assessmentId: string): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error('Assessment ID is required');
    }
    
    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error('Database error in getAssessmentResults:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    if (assessment.status !== 'COMPLETED') {
      throw new Error('Assessment not completed yet. Complete the assessment first.');
    }
    
    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];
    const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
    const aiAnalysis = assessment.ai_analysis || {};
    
    const questionBreakdown = answers.map((a: any, idx: number) => ({
      questionId: a.questionId || `q${idx + 1}`,
      questionText: questions[idx]?.questionText || '',  
      userAnswer: a.userAnswer || '',  
      correctAnswer: questions[idx]?.correctAnswer || '',  
      isCorrect: a.aiEvaluation?.isCorrect || false,  
      score: a.aiEvaluation?.score || 0,
      difficulty: questions[idx]?.difficulty || 'BEGINNER',
      timeTaken: a.timeTaken,
      feedback: a.aiEvaluation?.feedback || '',
      category: assessment.skill_category  
    }));
    
    const totalQuestions = questions.length;
    const correctAnswers = answers.filter((a: any) => a.aiEvaluation?.isCorrect).length;
    const totalTimeSpent = answers.reduce((sum: number, a: any) => sum + (a.timeTaken || 0), 0);
    
    return {
      success: true,
      data: {
        assessmentId: assessment.assessment_id,
        skillCategory: assessment.skill_category,
        overallScore: assessment.overall_score,
        skillLevel: assessment.skill_level_result,
        completedAt: assessment.completed_at?.toISOString() || new Date().toISOString(),  
        totalQuestions,  
        correctAnswers,  
        timeSpent: totalTimeSpent,  
        strengths: assessment.strengths || [],
        weaknesses: assessment.weaknesses || [],
        recommendations: assessment.recommendations || [],
        aiAnalysis,
        questions: questionBreakdown,
      },
    };
    
  } catch (error: any) {
    console.error('Error in getAssessmentResults:', error);
    throw new Error(error.message || 'Failed to get assessment results');
  }
};

export const getAssessmentHistory = async (candidateId: string): Promise<any> => {
  try {
    if (!candidateId) {
      throw new Error('Candidate ID is required');
    }
    
    let assessments;
    try {
      assessments = await prisma.skillAssessment.findMany({
        where: { candidate_id: candidateId, status: 'COMPLETED' },
        orderBy: { completed_at: 'desc' },
      });
    } catch (dbError: any) {
      console.error('Database error in getAssessmentHistory:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    const history = assessments.map((a, idx) => {
      let improvement = undefined;
      if (idx < assessments.length - 1) {
        const diff = (a.overall_score || 0) - (assessments[idx + 1].overall_score || 0);
        improvement = diff > 0 ? `+${diff.toFixed(1)} points from last attempt` : `${diff.toFixed(1)} points from last attempt`;
      }
      
      const answers = Array.isArray(a.answers) ? a.answers : [];
      const totalTimeSpent = answers.reduce((sum: number, ans: any) => sum + (ans.timeTaken || 0), 0);
      
      const totalQuestions = a.total_questions || 0;
      const correctAnswers = answers.filter((ans: any) => ans.aiEvaluation?.isCorrect).length;
      
      return {
        assessmentId: a.assessment_id,
        skillCategory: a.skill_category,
        overallScore: a.overall_score,
        skillLevel: a.skill_level_result,
        completedAt: a.completed_at,
        improvement,
        
        totalQuestions,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
        timeSpent: totalTimeSpent, // seconds
        difficulty: a.difficulty,
        provider: a.provider,
        
        strengths: a.strengths || [],
        weaknesses: a.weaknesses || [],
        recommendations: a.recommendations || [],
        confidenceScore: a.confidence_score,
      };
    });
    
    const skillProgress: Record<string, any> = {};
    for (const a of assessments) {
      const cat = a.skill_category;
      if (!skillProgress[cat]) {
        skillProgress[cat] = {
          currentLevel: a.skill_level_result,
          trend: 'STABLE',
          lastScore: a.overall_score,
          previousScore: undefined,
          totalAttempts: 1,
          bestScore: a.overall_score,
          averageScore: a.overall_score,
        };
      } else {
        skillProgress[cat].totalAttempts++;
        skillProgress[cat].previousScore = a.overall_score;
        skillProgress[cat].trend = (a.overall_score || 0) > (skillProgress[cat].lastScore || 0) ? 'IMPROVING' : 'DECLINING';
        skillProgress[cat].bestScore = Math.max(skillProgress[cat].bestScore, a.overall_score || 0);
        skillProgress[cat].averageScore = (skillProgress[cat].averageScore * (skillProgress[cat].totalAttempts - 1) + (a.overall_score || 0)) / skillProgress[cat].totalAttempts;
      }
    }
    
    return {
      success: true,
      data: {
        assessments: history,
        skillProgress,
        summary: {
          totalAssessments: assessments.length,
          uniqueSkills: Object.keys(skillProgress).length,
          averageScore: assessments.length > 0 
            ? assessments.reduce((sum, a) => sum + (a.overall_score || 0), 0) / assessments.length 
            : 0,
          totalTimeSpent: history.reduce((sum, h) => sum + h.timeSpent, 0),
        }
      },
    };
    
  } catch (error: any) {
    console.error('Error in getAssessmentHistory:', error);
    throw new Error(error.message || 'Failed to get assessment history');
  }
};







export const getRecommendations = async (candidateId: string): Promise<any> => {
  try {
    if (!candidateId) {
      throw new Error('Candidate ID is required');
    }
    
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
    
    const assessments = await prisma.skillAssessment.findMany({
      where: { candidate_id: candidateId, status: 'COMPLETED' },
      orderBy: { completed_at: 'desc' },
      take: 5
    });
    
    let aiRecommendations;
    try {
      aiRecommendations = await aiAssessment.generateRecommendations({
        currentSkills: candidate.candidateSkills.map(s => s.skill_name),
        assessmentHistory: assessments.map(a => ({
          skill: a.skill_category,
          score: a.overall_score,
          level: a.skill_level_result
        })),
        experienceLevel: candidate.candidateProfile?.experience || 'Intermediate',
        careerGoals: 'General Development'  // ✅ Fixed - hardcoded fallback
      });
    } catch (aiError: any) {
      console.error('AI recommendations error:', aiError);
      
      aiRecommendations = {
        recommendations: [{
          skillName: 'Professional Development',
          priority: 'MEDIUM',
          reason: 'Continue skill growth',
          description: 'Expand your technical expertise',
          estimatedTime: '2-4 weeks',
          difficulty: 'INTERMEDIATE'
        }],
        careerPaths: ['Software Developer'],
        marketReadiness: 'Developing'
      };
    }
    
    return {
      success: true,
      data: {
        recommendations: aiRecommendations.recommendations || [],
        learningPath: aiRecommendations.recommendations?.map((rec: any, idx: number) => ({
          skill: rec.skillName,
          reason: rec.reason,
          difficulty: rec.difficulty,
          estimatedTime: rec.estimatedTime,
          marketValue: `Potential ${rec.priority} impact`,
          resources: [
            'Online Documentation',
            'Practice Projects',
            'Community Forums'
          ]
        })) || []
      }
    };
    
  } catch (error: any) {
    console.error('Error in getRecommendations:', error);
    throw new Error(error.message || 'Failed to generate recommendations');
  }
};

// ==================== FALLBACK FUNCTIONS ====================

const getFallbackQuestions = (skillCategory: string, difficulty: string, count: number): Question[] => {
  // Basic fallback questions when AI service fails
  const fallbackQuestions: Question[] = [
    {
      questionId: 'fallback_1',
      questionText: `What is your experience level with ${skillCategory}?`,
      type: QuestionType.MCQ,
      options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      correctAnswer: 'Intermediate',
      difficulty: difficulty as any,
      timeLimit: 90,
      aiGenerated: false,
      adaptedReason: 'Fallback question due to AI service unavailability'
    }
  ];
  
  return Array(count).fill(0).map((_, idx) => ({
    ...fallbackQuestions[0],
    questionId: `fallback_${idx + 1}`,
    questionText: `Question ${idx + 1}: Basic ${skillCategory} knowledge check`
  }));
};

const getFallbackEvaluation = (question: Question, answer: string): any => {
  // Basic evaluation when AI service fails
  return {
    score: 70, // Average score
    feedback: 'Answer recorded. Detailed evaluation unavailable due to service limitations.',
    strengths: ['Answer provided'],
    improvements: ['Detailed analysis pending'],
    confidence: 50,
    isCorrect: true
  };
};

const generateFallbackReport = (assessment: any, results: any[]): any => {
  const avgScore = results.length > 0 
    ? results.reduce((sum, r) => sum + (r.aiEvaluation?.score || 0), 0) / results.length 
    : 70;
    
  return {
    overallScore: avgScore,
    skillLevel: avgScore >= 80 ? 'ADVANCED' : avgScore >= 60 ? 'INTERMEDIATE' : 'BEGINNER',
    strengths: ['Assessment completed', 'Consistent performance'],
    weaknesses: ['Detailed analysis pending'],
    recommendations: ['Continue practicing', 'Review fundamentals'],
    confidenceScore: 75
  };
};

const calculateBasicScore = (results: any[]): number => {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + (r.aiEvaluation?.score || 0), 0) / results.length;
};