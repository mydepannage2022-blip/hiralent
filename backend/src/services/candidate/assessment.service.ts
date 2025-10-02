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
    
    // ✅ AUTO-COMPLETE: If last question, trigger complete
    if (isLastQuestion) {
      console.log('Last question answered, auto-completing assessment...');
      try {
        await completeAssessment(assessmentId);
        console.log('Assessment auto-completed successfully');
      } catch (completeError: any) {
        console.error('Auto-complete error:', completeError);
        // Don't throw - answer is saved, completion can be retried
      }
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
              options: nextQ.options || [],
              timeLimit: nextQ.timeLimit || 90,
              difficulty: nextQ.difficulty || assessment.difficulty || 'INTERMEDIATE', 
            }
          : null,
        isLastQuestion, // ✅ Add this flag
        completed: isLastQuestion, // ✅ Keep this for compatibility
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
    
    // ==================== STEP 1: FETCH ASSESSMENT ====================
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
    
    // ==================== CHECK IF ALREADY COMPLETED ====================
    if (assessment.status === 'COMPLETED') {
      const existingSummary = await prisma.assessmentSummary.findUnique({
        where: { assessment_id: assessmentId }
      });
      
      if (existingSummary) {
        console.log('Assessment already completed, returning existing summary');
        return { 
          success: true, 
          data: { 
            assessmentId: assessment.assessment_id,
            skillCategory: assessment.skill_category,
            assessmentType: assessment.assessment_type,
            status: 'COMPLETED',
            message: 'Assessment already completed',
            difficulty: assessment.difficulty,
            completedAt: assessment.completed_at,
            
            // Overall Performance
            overallScore: existingSummary.overall_score,
            skillLevel: existingSummary.skill_level,
            passStatus: existingSummary.pass_status,
            
            // Performance Breakdown
            correctAnswers: existingSummary.correct_answers,
            incorrectAnswers: existingSummary.incorrect_answers,
            partialAnswers: existingSummary.partial_answers,
            totalQuestions: existingSummary.total_questions,
            accuracyRate: existingSummary.accuracy_rate,
            
            // Time Metrics
            totalTimeSpent: existingSummary.total_time_spent,
            avgTimePerQuestion: existingSummary.avg_time_per_question,
            
            // Category & Difficulty Scores
            categoryScores: existingSummary.category_scores,
            difficultyScores: existingSummary.difficulty_scores,
            
            // AI Insights
            strengths: existingSummary.strengths,
            weaknesses: existingSummary.weaknesses,
            recommendations: existingSummary.recommendations,
            nextSteps: existingSummary.next_steps,
            aiConfidence: existingSummary.ai_confidence,
            
            // Achievements
            achievements: existingSummary.achievements,
            badgesEarned: existingSummary.badges_earned,
            
            // Navigation
            nextActions: {
              jobMatching: '/api/v1/candidates/match-jobs',
              detailedResults: `/api/v1/candidates/assessment/${assessmentId}/results`,
              retakeAssessment: '/api/v1/candidates/start-assessment',
              viewHistory: '/api/v1/candidates/assessments/history'
            }
          } 
        };
      }
      
      console.warn('Assessment marked COMPLETED but no summary found, generating now...');
    }
    
    // ==================== STEP 2: PARSE QUESTIONS & ANSWERS ====================
    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];
    const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
    
    if (questions.length === 0) {
      throw new Error('No questions found in assessment');
    }
    
    if (answers.length === 0) {
      throw new Error('No answers submitted yet');
    }
    
    // ==================== STEP 3: CALCULATE METRICS ====================
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let partialAnswers = 0;
    let totalTimeSpent = 0;
    
    const difficultyStats: Record<string, { correct: number; total: number }> = {
      BEGINNER: { correct: 0, total: 0 },
      INTERMEDIATE: { correct: 0, total: 0 },
      ADVANCED: { correct: 0, total: 0 },
      EXPERT: { correct: 0, total: 0 }
    };
    
    answers.forEach((ans: any, idx: number) => {
      const question = questions[idx];
      const difficulty = question?.difficulty || 'INTERMEDIATE';
      
      difficultyStats[difficulty].total++;
      
      if (ans.aiEvaluation?.isCorrect === true) {
        correctAnswers++;
        difficultyStats[difficulty].correct++;
      } else if (ans.aiEvaluation?.score > 0 && ans.aiEvaluation?.score < 100) {
        partialAnswers++;
      } else {
        incorrectAnswers++;
      }
      
      totalTimeSpent += ans.timeTaken || 0;
    });
    
    const totalQuestions = questions.length;
    const accuracyRate = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100) 
      : 0;
    const avgTimePerQuestion = totalQuestions > 0 
      ? Math.round(totalTimeSpent / totalQuestions) 
      : 0;
    
    // ==================== STEP 4: GENERATE AI REPORT ====================
    let report;
    try {
      console.log('Generating AI report...');
      report = await aiAssessment.generateReport({
        assessment,
        results: answers,
        totalTime: totalTimeSpent,
      });
      console.log('AI report generated successfully');
    } catch (aiError: any) {
      console.error('AI report generation error:', aiError);
      report = generateFallbackReport(assessment, answers, questions);
      console.warn('Using fallback report due to AI service failure');
    }
    
    const overallScore = report?.overallScore || calculateBasicScore(answers);
    const skillLevel = report?.skillLevel || determineSkillLevel(overallScore);
    const passStatus = overallScore >= 60 ? 'passed' : 'failed';
    
    // ==================== STEP 5: SAVE TO DATABASE (TRANSACTION) ====================
    console.log('Saving results to database...');
    const result = await prisma.$transaction(async (tx) => {
      // 5.1: Update SkillAssessment
      const updatedAssessment = await tx.skillAssessment.update({
        where: { assessment_id: assessmentId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          overall_score: overallScore,
          skill_level_result: skillLevel,
          strengths: report?.strengths || [],
          weaknesses: report?.weaknesses || [],
          recommendations: report?.recommendations || [],
          ai_analysis: report || {},
          confidence_score: report?.confidenceScore || 75,
        },
      });
      
      // 5.2: Save Individual Question Results to AssessmentResult table
      const assessmentResults = answers.map((ans: any, idx: number) => {
        const question = questions[idx];
        return {
          assessment_id: assessmentId,
          question_id: ans.questionId || question?.questionId || `q${idx + 1}`,
          question_text: question?.questionText || '',
          question_type: question?.type || 'MCQ',
          expected_answer: question?.correctAnswer || null,
          user_answer: ans.userAnswer || '',
          is_correct: ans.aiEvaluation?.isCorrect || false,
          partial_score: ans.aiEvaluation?.score || 0,
          time_taken: ans.timeTaken || 0,
          ai_evaluation: ans.aiEvaluation || {},
          feedback: ans.aiEvaluation?.feedback || null,
          answered_at: ans.answeredAt ? new Date(ans.answeredAt) : new Date()
        };
      });
      
      await tx.assessmentResult.createMany({
        data: assessmentResults,
        skipDuplicates: true
      });
      
      // 5.3: Save Summary to AssessmentSummary table
      const achievements = generateAchievements(overallScore, correctAnswers, totalQuestions);
      const badges = generateBadges(overallScore, skillLevel);
      
      const summary = await tx.assessmentSummary.create({
        data: {
          assessment_id: assessmentId,
          overall_score: overallScore,
          skill_level: skillLevel,
          pass_status: passStatus,
          correct_answers: correctAnswers,
          incorrect_answers: incorrectAnswers,
          partial_answers: partialAnswers,
          total_questions: totalQuestions,
          accuracy_rate: accuracyRate,
          total_time_spent: totalTimeSpent,
          avg_time_per_question: avgTimePerQuestion,
          category_scores: { [assessment.skill_category]: overallScore },
          difficulty_scores: difficultyStats,
          strengths: report?.strengths || [],
          weaknesses: report?.weaknesses || [],
          recommendations: report?.recommendations || [],
          next_steps: report?.careerSuggestions || ['Continue learning', 'Apply to jobs'],
          ai_confidence: report?.confidenceScore || 75,
          achievements,
          badges_earned: badges
        }
      });
      
      return { updatedAssessment, summary };
    });
    
    console.log('Assessment completed and saved successfully');
    
    // ==================== STEP 6: RETURN COMPLETE SUCCESS RESPONSE ====================
    return {
      success: true,
      data: {
        // Basic Info
        assessmentId: result.updatedAssessment.assessment_id,
        skillCategory: assessment.skill_category,
        assessmentType: assessment.assessment_type,
        difficulty: assessment.difficulty,
        status: result.updatedAssessment.status,
        completedAt: result.updatedAssessment.completed_at,
        
        // Overall Performance
        overallScore: result.summary.overall_score,
        skillLevel: result.summary.skill_level,
        passStatus: result.summary.pass_status,
        
        // Detailed Breakdown
        correctAnswers: result.summary.correct_answers,
        incorrectAnswers: result.summary.incorrect_answers,
        partialAnswers: result.summary.partial_answers,
        totalQuestions: result.summary.total_questions,
        accuracyRate: result.summary.accuracy_rate,
        
        // Time Metrics
        totalTimeSpent: result.summary.total_time_spent,
        avgTimePerQuestion: result.summary.avg_time_per_question,
        
        // Category & Difficulty Analysis
        categoryScores: result.summary.category_scores,
        difficultyScores: result.summary.difficulty_scores,
        
        // AI Insights
        strengths: result.summary.strengths,
        weaknesses: result.summary.weaknesses,
        recommendations: result.summary.recommendations,
        nextSteps: result.summary.next_steps,
        aiConfidence: result.summary.ai_confidence,
        
        // Gamification
        achievements: result.summary.achievements,
        badgesEarned: result.summary.badges_earned,
        
        // Navigation
        nextActions: {
          jobMatching: '/api/v1/candidates/match-jobs',
          detailedResults: `/api/v1/candidates/assessment/${assessmentId}/results`,
          retakeAssessment: '/api/v1/candidates/start-assessment',
          viewHistory: '/api/v1/candidates/assessments/history'
        }
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
    
    // ==================== STEP 1: FETCH SUMMARY FROM DB ====================
    let summary;
    try {
      summary = await prisma.assessmentSummary.findUnique({
        where: { assessment_id: assessmentId },
        include: {
          assessment: true
        }
      });
    } catch (dbError: any) {
      console.error('Database error fetching summary:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    if (!summary) {
      throw new Error('Assessment results not found. Please complete the assessment first.');
    }
    
    // ==================== STEP 2: FETCH QUESTION RESULTS ====================
    let questionResults;
    try {
      questionResults = await prisma.assessmentResult.findMany({
        where: { assessment_id: assessmentId },
        orderBy: { answered_at: 'asc' }
      });
    } catch (dbError: any) {
      console.error('Database error fetching question results:', dbError);
      questionResults = [];
    }
    
    // ==================== STEP 3: FORMAT RESPONSE ====================
    const questions = questionResults.map(q => ({
      questionId: q.question_id,
      questionText: q.question_text,
      questionType: q.question_type,
      userAnswer: q.user_answer,
      correctAnswer: q.expected_answer || '',
      isCorrect: q.is_correct || false,
      score: q.partial_score || 0,
      difficulty: summary.assessment.difficulty || 'INTERMEDIATE',
      timeTaken: q.time_taken,
      feedback: q.feedback || '',
      category: summary.assessment.skill_category
    }));
    
    return {
      success: true,
      data: {
        // Basic Info
        assessmentId: summary.assessment_id,
        skillName: summary.assessment.skill_category,
        skillCategory: summary.assessment.skill_category,
        assessmentType: summary.assessment.assessment_type,
        difficulty: summary.assessment.difficulty,
        completedAt: summary.assessment.completed_at,
        
        // Overall Performance
        overallScore: summary.overall_score,
        skillLevel: summary.skill_level,
        passStatus: summary.pass_status,
        
        // Performance Breakdown
        totalQuestions: summary.total_questions,
        correctAnswers: summary.correct_answers,
        incorrectAnswers: summary.incorrect_answers,
        partialAnswers: summary.partial_answers,
        accuracyRate: summary.accuracy_rate,
        
        // Time Metrics
        timeSpent: summary.total_time_spent,
        avgTimePerQuestion: summary.avg_time_per_question,
        
        // Category & Difficulty Analysis
        categoryScores: summary.category_scores,
        difficultyScores: summary.difficulty_scores,
        difficultyStats: summary.difficulty_scores,
        
        // AI Insights
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        recommendations: summary.recommendations,
        nextSteps: summary.next_steps,
        aiConfidence: summary.ai_confidence,
        aiAnalysis: summary.assessment.ai_analysis || {},
        
        // Achievements
        achievements: summary.achievements,
        badgesEarned: summary.badges_earned,
        
        // Question Breakdown
        questions: questions,
        questionResults: questions
      }
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
        include: {
          summary: true // This should work after schema fix
        },
        orderBy: { completed_at: 'desc' },
      });
    } catch (dbError: any) {
      console.error('Database error in getAssessmentHistory:', dbError);
      throw new Error('Database connection failed. Please try again later.');
    }
    
    const history = assessments.map((a, idx) => {
      // Use summary if available, otherwise fallback to old data
      const overallScore = a.summary?.overall_score || a.overall_score || 0;
      const skillLevel = a.summary?.skill_level || a.skill_level_result || 'BEGINNER';
      const correctAnswers = a.summary?.correct_answers || 0;
      const totalQuestions = a.summary?.total_questions || a.total_questions || 0;
      const timeSpent = a.summary?.total_time_spent || 0;
      
      let improvement = undefined;
      if (idx < assessments.length - 1) {
        const prevScore = assessments[idx + 1].summary?.overall_score || assessments[idx + 1].overall_score || 0;
        const diff = overallScore - prevScore;
        improvement = diff > 0 
          ? `+${diff.toFixed(1)} points from last attempt` 
          : `${diff.toFixed(1)} points from last attempt`;
      }
      
      return {
        assessmentId: a.assessment_id,
        skillCategory: a.skill_category,
        overallScore: overallScore,
        skillLevel: skillLevel,
        completedAt: a.completed_at,
        improvement,
        
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
        timeSpent: timeSpent,
        accuracyRate: a.summary?.accuracy_rate || 0,
        
        difficulty: a.difficulty,
        provider: a.provider,
        
        strengths: a.summary?.strengths || a.strengths || [],
        weaknesses: a.summary?.weaknesses || a.weaknesses || [],
        recommendations: a.summary?.recommendations || a.recommendations || [],
        achievements: a.summary?.achievements || [],
        
        confidenceScore: a.summary?.ai_confidence || a.confidence_score,
      };
    });
    
    const skillProgress: Record<string, any> = {};
    for (const a of assessments) {
      const cat = a.skill_category;
      const score = a.summary?.overall_score || a.overall_score || 0;
      const level = a.summary?.skill_level || a.skill_level_result || 'BEGINNER';
      
      if (!skillProgress[cat]) {
        skillProgress[cat] = {
          currentLevel: level,
          trend: 'STABLE',
          lastScore: score,
          previousScore: undefined,
          totalAttempts: 1,
          bestScore: score,
          averageScore: score,
        };
      } else {
        skillProgress[cat].totalAttempts++;
        skillProgress[cat].previousScore = score;
        skillProgress[cat].trend = score > skillProgress[cat].lastScore ? 'IMPROVING' : 'DECLINING';
        skillProgress[cat].bestScore = Math.max(skillProgress[cat].bestScore, score);
        skillProgress[cat].averageScore = 
          (skillProgress[cat].averageScore * (skillProgress[cat].totalAttempts - 1) + score) 
          / skillProgress[cat].totalAttempts;
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
            ? assessments.reduce((sum, a) => sum + (a.summary?.overall_score || a.overall_score || 0), 0) / assessments.length 
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
function calculateBasicScore(answers: any[]): number {
  if (answers.length === 0) return 0;
  const scores = answers.map((a: any) => a.aiEvaluation?.score || 0);
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / answers.length);
}

function determineSkillLevel(score: number): string {
  if (score >= 90) return 'EXPERT';
  if (score >= 75) return 'ADVANCED';
  if (score >= 60) return 'INTERMEDIATE';
  return 'BEGINNER';
}

function generateAchievements(score: number, correct: number, total: number): string[] {
  const achievements: string[] = [];
  
  if (score >= 90) achievements.push('Outstanding Performance');
  if (score >= 80) achievements.push('High Achiever');
  if (score >= 70) achievements.push('Strong Performer');
  if (correct === total) achievements.push('Perfect Score');
  if (score >= 75) achievements.push('Above Average');
  
  return achievements;
}

function generateBadges(score: number, skillLevel: string): string[] {
  const badges: string[] = [];
  
  if (score >= 90) badges.push('gold_medal');
  else if (score >= 80) badges.push('silver_medal');
  else if (score >= 70) badges.push('bronze_medal');
  
  if (skillLevel === 'EXPERT') badges.push('expert_badge');
  if (skillLevel === 'ADVANCED') badges.push('advanced_badge');
  
  return badges;
}

function generateFallbackReport(assessment: any, answers: any[], questions: Question[]): any {
  const score = calculateBasicScore(answers);
  const level = determineSkillLevel(score);
  const skillCategory = assessment.skill_category;
  
  // ==================== ANALYZE ANSWERS ====================
  const correctByDifficulty: Record<string, number> = {
    BEGINNER: 0,
    INTERMEDIATE: 0,
    ADVANCED: 0,
    EXPERT: 0
  };
  
  const totalByDifficulty: Record<string, number> = {
    BEGINNER: 0,
    INTERMEDIATE: 0,
    ADVANCED: 0,
    EXPERT: 0
  };
  
  answers.forEach((ans: any, idx: number) => {
    const question = questions[idx];
    const difficulty = question?.difficulty || 'INTERMEDIATE';
    
    totalByDifficulty[difficulty]++;
    if (ans.aiEvaluation?.isCorrect) {
      correctByDifficulty[difficulty]++;
    }
  });
  
  // ==================== GENERATE REAL STRENGTHS ====================
  const strengths: string[] = [];
  
  if (correctByDifficulty.BEGINNER === totalByDifficulty.BEGINNER && totalByDifficulty.BEGINNER > 0) {
    strengths.push(`Strong foundation in ${skillCategory} fundamentals`);
  }
  
  if (correctByDifficulty.INTERMEDIATE > 0) {
    const percentage = Math.round((correctByDifficulty.INTERMEDIATE / totalByDifficulty.INTERMEDIATE) * 100);
    if (percentage >= 70) {
      strengths.push(`Good understanding of intermediate ${skillCategory} concepts (${percentage}% accuracy)`);
    }
  }
  
  if (correctByDifficulty.ADVANCED > 0) {
    strengths.push(`Capable of handling advanced ${skillCategory} challenges`);
  }
  
  if (score >= 80) {
    strengths.push(`Consistently accurate across all difficulty levels`);
  }
  
  if (strengths.length === 0) {
    strengths.push(`Completed ${skillCategory} assessment`);
  }
  
  // ==================== GENERATE REAL WEAKNESSES ====================
  const weaknesses: string[] = [];
  
  if (totalByDifficulty.BEGINNER > 0 && correctByDifficulty.BEGINNER < totalByDifficulty.BEGINNER) {
    const missed = totalByDifficulty.BEGINNER - correctByDifficulty.BEGINNER;
    weaknesses.push(`Review ${skillCategory} basics (missed ${missed} fundamental question${missed > 1 ? 's' : ''})`);
  }
  
  if (totalByDifficulty.INTERMEDIATE > 0) {
    const percentage = Math.round((correctByDifficulty.INTERMEDIATE / totalByDifficulty.INTERMEDIATE) * 100);
    if (percentage < 60) {
      weaknesses.push(`Needs improvement in intermediate ${skillCategory} areas (${percentage}% accuracy)`);
    }
  }
  
  if (totalByDifficulty.ADVANCED > 0 && correctByDifficulty.ADVANCED === 0) {
    weaknesses.push(`Advanced ${skillCategory} topics require more practice`);
  }
  
  if (score < 60) {
    weaknesses.push(`Overall accuracy below proficiency threshold`);
  }
  
  if (weaknesses.length === 0) {
    weaknesses.push(`Minor improvements possible in advanced ${skillCategory} topics`);
  }
  
  // ==================== GENERATE REAL RECOMMENDATIONS ====================
  const recommendations: string[] = [];
  
  if (correctByDifficulty.BEGINNER < totalByDifficulty.BEGINNER) {
    recommendations.push(`Focus on ${skillCategory} fundamentals: Review core concepts and principles`);
  }
  
  if (score < 70) {
    recommendations.push(`Practice more ${skillCategory} exercises and real-world scenarios`);
    recommendations.push(`Take a structured ${skillCategory} course to fill knowledge gaps`);
  }
  
  if (totalByDifficulty.ADVANCED > 0 && correctByDifficulty.ADVANCED < totalByDifficulty.ADVANCED) {
    recommendations.push(`Study advanced ${skillCategory} techniques and best practices`);
  }
  
  if (score >= 70 && score < 85) {
    recommendations.push(`Apply ${skillCategory} skills in practical projects to strengthen expertise`);
  }
  
  if (score >= 85) {
    recommendations.push(`Consider mentoring others or creating content about ${skillCategory}`);
    recommendations.push(`Explore advanced specializations within ${skillCategory}`);
  }
  
  // ==================== GENERATE REAL CAREER SUGGESTIONS ====================
  const careerSuggestions: string[] = [];
  
  if (level === 'EXPERT' || score >= 90) {
    careerSuggestions.push(`Apply for senior-level positions requiring ${skillCategory} expertise`);
    careerSuggestions.push(`Consider leadership or specialist roles in ${skillCategory}`);
  } else if (level === 'ADVANCED' || score >= 75) {
    careerSuggestions.push(`Target mid-level professional roles in ${skillCategory}`);
    careerSuggestions.push(`Continue building portfolio showcasing ${skillCategory} skills`);
  } else if (level === 'INTERMEDIATE' || score >= 60) {
    careerSuggestions.push(`Seek entry to junior-level positions in ${skillCategory}`);
    careerSuggestions.push(`Build 2-3 strong portfolio pieces demonstrating ${skillCategory} competency`);
  } else {
    careerSuggestions.push(`Complete a comprehensive ${skillCategory} training program`);
    careerSuggestions.push(`Practice regularly and retake assessment after 2-3 months of study`);
  }
  
  return {
    overallScore: score,
    skillLevel: level,
    strengths,
    weaknesses,
    recommendations,
    careerSuggestions,
    confidenceScore: 70,
    marketReadiness: level === 'EXPERT' ? 'Job Ready' : level === 'ADVANCED' ? 'Nearly Ready' : 'Keep Learning'
  };
}





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

