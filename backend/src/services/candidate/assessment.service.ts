import { Json } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/db_control";
import prisma from "../../lib/prisma";
import { StartAssessmentParams, Question } from "../../types/assessment.types";
import * as aiAssessment from "./aiAssessment.service";
import { QuestionType } from "../../types/assessment.types";

export const startAssessment = async (
  params: StartAssessmentParams
): Promise<any> => {
  try {
    const { candidateId, skillCategory, assessmentType, difficulty } = params;

    let candidateWithProfile;
    try {
      candidateWithProfile = await prisma.user.findUnique({
        where: { user_id: candidateId },
        include: {
          candidateProfile: true,
          candidateSkills: true,
        },
      });
    } catch (dbError: any) {
      console.error("Database error in startAssessment:", dbError);
      throw new Error("Database connection failed. Please try again later.");
    }

    if (!candidateWithProfile?.candidateProfile) {
      throw new Error(
        "Candidate profile not found. Please complete your profile first."
      );
    }

    const candidateProfile = candidateWithProfile.candidateProfile;
    const candidateSkills = candidateWithProfile.candidateSkills;

    const aiProfile = {
      experienceLevel: candidateProfile.experience || "",
      existingSkills: candidateSkills.map((skill) => skill.skill_name),
      industry: "",
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
      console.error("AI service error in startAssessment:", aiError);

      questions = getFallbackQuestions(
        skillCategory,
        difficulty,
        questionCount
      );
      console.warn(
        `Using fallback questions for ${skillCategory} due to AI service failure`
      );
    }

    if (!questions || questions.length === 0) {
      throw new Error(
        `Unable to generate questions for ${skillCategory}. Please try a different skill category.`
      );
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
          status: "PENDING",
          current_question: 0,
          questions: questions as Json,
          answers: [] as Json,
          started_at: new Date(),
        } as any,
      });
    } catch (dbError: any) {
      console.error("Database error creating assessment:", dbError);
      throw new Error("Failed to create assessment. Please try again.");
    }

    const firstQuestion = questions[0]
      ? {
          questionId: questions[0].questionId || "q1",
          questionText: questions[0].questionText,
          type: questions[0].type,
          options:
            questions[0].options?.map((opt: string, idx: number) => ({
              id: `opt-${idx + 1}`,
              text: opt,
            })) || [],
          timeLimit: questions[0].timeLimit || 90,
          difficulty: questions[0].difficulty || difficulty,
        }
      : null;

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
    console.error("Error in startAssessment:", error);
    throw new Error(
      error.message || "Failed to start assessment. Please try again."
    );
  }
};

export const getNextQuestion = async (assessmentId: string): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error("Assessment ID is required");
    }

    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error("Database error in getNextQuestion:", dbError);
      throw new Error("Database connection failed. Please try again later.");
    }

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    if (
      assessment.status !== "IN_PROGRESS" &&
      assessment.status !== "PENDING"
    ) {
      throw new Error(
        `Assessment is ${assessment.status.toLowerCase()}. Cannot get questions.`
      );
    }

    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];

    if (!questions || questions.length === 0) {
      throw new Error("No questions found for this assessment");
    }

    const idx = assessment.current_question;
    if (idx >= questions.length) {
      throw new Error(
        "No more questions available. Assessment should be completed."
      );
    }

    const q = questions[idx];
    if (!q) {
      throw new Error("Question not found at current index");
    }

    if (assessment.status === "PENDING") {
      try {
        await prisma.skillAssessment.update({
          where: { assessment_id: assessmentId },
          data: {
            status: "IN_PROGRESS",
            started_at: new Date(),
          },
        });
      } catch (dbError: any) {
        console.warn(
          "Failed to update assessment status to IN_PROGRESS:",
          dbError
        );
      }
    }

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
          adaptedReason: "",
          category: assessment.skill_category,
          correctAnswer: q.correctAnswer || "",
        },
        currentIndex: idx,
        totalQuestions: questions.length,
        hasNext: idx + 1 < questions.length,
      },
    };
  } catch (error: any) {
    console.error("Error in getNextQuestion:", error);
    throw new Error(error.message || "Failed to get next question");
  }
};

export const submitAnswer = async (params: {
  assessmentId: string;
  questionId: string;
  answer: string;
  timeTaken: number;
}): Promise<any> => {
  try {
    const { assessmentId, questionId, answer, timeTaken } = params;

    if (!assessmentId || !questionId || answer === undefined || timeTaken < 0) {
      throw new Error("Missing or invalid required parameters");
    }

    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error("Database error in submitAnswer:", dbError);
      throw new Error("Database connection failed. Please try again later.");
    }

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    if (
      assessment.status !== "IN_PROGRESS" &&
      assessment.status !== "PENDING"
    ) {
      throw new Error(
        `Cannot submit answer. Assessment is ${assessment.status.toLowerCase()}.`
      );
    }

    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];

    if (!questions || questions.length === 0) {
      throw new Error("No questions found for this assessment");
    }

    const idx = assessment.current_question;
    if (idx >= questions.length) {
      throw new Error("No more questions to answer");
    }

    const currentQ = questions[idx];
    if (!currentQ) {
      throw new Error("Current question not found");
    }

    if (currentQ.questionId !== questionId && `q${idx + 1}` !== questionId) {
      throw new Error(
        "Invalid question ID or answers submitted out of sequence"
      );
    }

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
      console.error("AI evaluation error:", aiError);
      aiEval = getFallbackEvaluation(currentQ, answer);
      console.warn("Using fallback evaluation due to AI service failure");
    }

    const answers = Array.isArray(assessment.answers)
      ? [...(assessment.answers as any[])]
      : [];
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
          status: isLastQuestion ? "COMPLETED" : "IN_PROGRESS",
        },
      });
    } catch (dbError: any) {
      console.error("Database error updating assessment:", dbError);
      throw new Error("Failed to save answer. Please try again.");
    }

    if (isLastQuestion) {
      try {
        await completeAssessment(assessmentId);
      } catch (completeError: any) {
        console.error("Auto-complete error:", completeError);
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
              difficulty:
                nextQ.difficulty || assessment.difficulty || "INTERMEDIATE",
            }
          : null,
        isLastQuestion,
        completed: isLastQuestion,
      },
    };
  } catch (error: any) {
    console.error("Error in submitAnswer:", error);
    throw new Error(error.message || "Failed to submit answer");
  }
};

export const getProgress = async (assessmentId: string): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error("Assessment ID is required");
    }

    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error("Database error in getProgress:", dbError);
      throw new Error("Database connection failed. Please try again later.");
    }

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const totalQuestions = assessment.total_questions;
    const currentQuestion = assessment.current_question;
    const answers = Array.isArray(assessment.answers) ? assessment.answers : [];

    const progressPercentage = Math.round(
      (currentQuestion / totalQuestions) * 100
    );
    const scores = answers.map((a: any) => a.aiEvaluation?.score || 0);
    const currentScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    let timeRemaining = null;
    if (assessment.started_at && assessment.time_limit) {
      const elapsed =
        (Date.now() - new Date(assessment.started_at).getTime()) / 1000;
      timeRemaining = Math.max(0, assessment.time_limit * 60 - elapsed);
    }

    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];
    const difficultyCurve = questions
      .slice(0, currentQuestion)
      .map((q) => q.difficulty || "BEGINNER");

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
    console.error("Error in getProgress:", error);
    throw new Error(error.message || "Failed to get progress");
  }
};

export const completeAssessment = async (
  assessmentId: string
): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error("Assessment ID is required");
    }

    let assessment;
    try {
      assessment = await prisma.skillAssessment.findUnique({
        where: { assessment_id: assessmentId },
      });
    } catch (dbError: any) {
      console.error("Database error in completeAssessment:", dbError);
      throw new Error("Database connection failed. Please try again later.");
    }

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    if (assessment.status === "COMPLETED") {
      const existingSummary = await prisma.assessmentSummary.findUnique({
        where: { assessment_id: assessmentId },
      });

      if (existingSummary) {
        return {
          success: true,
          data: {
            assessmentId: assessment.assessment_id,
            skillCategory: assessment.skill_category,
            assessmentType: assessment.assessment_type,
            status: "COMPLETED",
            message: "Assessment already completed",
            difficulty: assessment.difficulty,
            completedAt: assessment.completed_at,

            overallScore: existingSummary.overall_score,
            skillLevel: existingSummary.skill_level,
            passStatus: existingSummary.pass_status,

            correctAnswers: existingSummary.correct_answers,
            incorrectAnswers: existingSummary.incorrect_answers,
            partialAnswers: existingSummary.partial_answers,
            totalQuestions: existingSummary.total_questions,
            accuracyRate: existingSummary.accuracy_rate,

            totalTimeSpent: existingSummary.total_time_spent,
            avgTimePerQuestion: existingSummary.avg_time_per_question,

            categoryScores: existingSummary.category_scores,
            difficultyScores: existingSummary.difficulty_scores,

            strengths: existingSummary.strengths,
            weaknesses: existingSummary.weaknesses,
            recommendations: existingSummary.recommendations,
            nextSteps: existingSummary.next_steps,
            aiConfidence: existingSummary.ai_confidence,

            achievements: existingSummary.achievements,
            badgesEarned: existingSummary.badges_earned,

            nextActions: {
              jobMatching: "/api/v1/candidates/match-jobs",
              detailedResults: `/api/v1/candidates/assessment/${assessmentId}/results`,
              retakeAssessment: "/api/v1/candidates/start-assessment",
              viewHistory: "/api/v1/candidates/assessments/history",
            },
          },
        };
      }

      console.warn(
        "Assessment marked COMPLETED but no summary found, generating now..."
      );
    }

    const questions = Array.isArray(assessment.questions)
      ? (assessment.questions as unknown as Question[])
      : [];
    const answers = Array.isArray(assessment.answers) ? assessment.answers : [];

    if (questions.length === 0) {
      throw new Error("No questions found in assessment");
    }

    if (answers.length === 0) {
      throw new Error("No answers submitted yet");
    }

    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let partialAnswers = 0;
    let totalTimeSpent = 0;

    const difficultyStats: Record<string, { correct: number; total: number }> = {
      BEGINNER: { correct: 0, total: 0 },
      INTERMEDIATE: { correct: 0, total: 0 },
      ADVANCED: { correct: 0, total: 0 },
      EXPERT: { correct: 0, total: 0 },
    };

    answers.forEach((ans: any, idx: number) => {
      const question = questions[idx];
      const difficulty = question?.difficulty || "INTERMEDIATE";

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
    const accuracyRate =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;
    const avgTimePerQuestion =
      totalQuestions > 0 ? Math.round(totalTimeSpent / totalQuestions) : 0;
    const totalTimeMinutes = Math.round(totalTimeSpent / 60);

    let report: any = null;
    try {
      const overallScore = calculateBasicScore(answers);
      const skillLevel = determineSkillLevel(overallScore);
      
      report = await aiAssessment.generateReport({
        assessment,
        results: answers,
        totalTime: totalTimeMinutes,
        overallScore,
        skillLevel
      });
      
    } catch (aiError: any) {
      console.error("AI report generation failed:", aiError);
      
      const basicScore = calculateBasicScore(answers);
      const basicLevel = determineSkillLevel(basicScore);
      
      report = generateFallbackReport({
        skillCategory: assessment.skill_category,
        overallScore: basicScore,
        skillLevel: basicLevel,
        correctAnswers,
        incorrectAnswers,
        totalQuestions,
        difficultyStats
      });
      
      console.warn("Using fallback report due to AI service failure");
    }

    const overallScore = report?.overallScore || calculateBasicScore(answers);
    const skillLevel = report?.skillLevel || determineSkillLevel(overallScore);
    const passStatus = overallScore >= 60 ? "passed" : "failed";

    const result = await prisma.$transaction(async (tx) => {
      const updatedAssessment = await tx.skillAssessment.update({
        where: { assessment_id: assessmentId },
        data: {
          status: "COMPLETED",
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

      const assessmentResults = answers.map((ans: any, idx: number) => {
        const question = questions[idx];
        return {
          assessment_id: assessmentId,
          question_id: ans.questionId || question?.questionId || `q${idx + 1}`,
          question_text: question?.questionText || "",
          question_type: question?.type || "MCQ",
          expected_answer: question?.correctAnswer || null,
          user_answer: ans.userAnswer || "",
          is_correct: ans.aiEvaluation?.isCorrect || false,
          partial_score: ans.aiEvaluation?.score || 0,
          time_taken: ans.timeTaken || 0,
          ai_evaluation: ans.aiEvaluation || {},
          feedback: ans.aiEvaluation?.feedback || null,
          answered_at: ans.answeredAt ? new Date(ans.answeredAt) : new Date(),
        };
      });

      await tx.assessmentResult.createMany({
        data: assessmentResults,
        skipDuplicates: true,
      });

      const achievements = generateAchievements(
        overallScore,
        correctAnswers,
        totalQuestions
      );
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
          next_steps: report?.nextSteps || [],
          ai_confidence: report?.confidenceScore || 75,

          achievements,
          badges_earned: badges,
        },
      });

      return { updatedAssessment, summary };
    });

    return {
      success: true,
      data: {
        assessmentId: result.updatedAssessment.assessment_id,
        skillCategory: assessment.skill_category,
        assessmentType: assessment.assessment_type,
        difficulty: assessment.difficulty,
        status: result.updatedAssessment.status,
        completedAt: result.updatedAssessment.completed_at,

        overallScore: result.summary.overall_score,
        skillLevel: result.summary.skill_level,
        passStatus: result.summary.pass_status,

        correctAnswers: result.summary.correct_answers,
        incorrectAnswers: result.summary.incorrect_answers,
        partialAnswers: result.summary.partial_answers,
        totalQuestions: result.summary.total_questions,
        accuracyRate: result.summary.accuracy_rate,

        totalTimeSpent: result.summary.total_time_spent,
        avgTimePerQuestion: result.summary.avg_time_per_question,

        categoryScores: result.summary.category_scores,
        difficultyScores: result.summary.difficulty_scores,

        strengths: result.summary.strengths,
        weaknesses: result.summary.weaknesses,
        recommendations: result.summary.recommendations,
        nextSteps: result.summary.next_steps,
        aiConfidence: result.summary.ai_confidence,

        achievements: result.summary.achievements,
        badgesEarned: result.summary.badges_earned,

        nextActions: {
          jobMatching: "/api/v1/candidates/match-jobs",
          detailedResults: `/api/v1/candidates/assessment/${assessmentId}/results`,
          retakeAssessment: "/api/v1/candidates/start-assessment",
          viewHistory: "/api/v1/candidates/assessments/history",
        },
      },
    };
  } catch (error: any) {
    console.error("Error in completeAssessment:", error);
    throw new Error(error.message || "Failed to complete assessment");
  }
};

export const getAssessmentResults = async (
  assessmentId: string
): Promise<any> => {
  try {
    if (!assessmentId) {
      throw new Error("Assessment ID is required");
    }

    let summary;
    try {
      summary = await prisma.assessmentSummary.findUnique({
        where: { assessment_id: assessmentId },
        include: {
          assessment: true,
        },
      });
    } catch (dbError: any) {
      console.error("Database error fetching summary:", dbError);
      throw new Error("Database connection failed. Please try again later.");
    }

    if (!summary) {
      throw new Error(
        "Assessment results not found. Please complete the assessment first."
      );
    }

    let questionResults;
    try {
      questionResults = await prisma.assessmentResult.findMany({
        where: { assessment_id: assessmentId },
        orderBy: { answered_at: "asc" },
      });
    } catch (dbError: any) {
      console.error("Database error fetching question results:", dbError);
      questionResults = [];
    }

    const questions = questionResults.map((q) => ({
      questionId: q.question_id,
      questionText: q.question_text,
      questionType: q.question_type,
      userAnswer: q.user_answer,
      correctAnswer: q.expected_answer || "",
      isCorrect: q.is_correct || false,
      score: q.partial_score || 0,
      difficulty: summary.assessment.difficulty || "INTERMEDIATE",
      timeTaken: q.time_taken,
      feedback: q.feedback || "",
      category: summary.assessment.skill_category,
    }));

    return {
      success: true,
      data: {
        assessmentId: summary.assessment_id,
        skillName: summary.assessment.skill_category,
        skillCategory: summary.assessment.skill_category,
        assessmentType: summary.assessment.assessment_type,
        difficulty: summary.assessment.difficulty,
        completedAt: summary.assessment.completed_at,

        overallScore: summary.overall_score,
        skillLevel: summary.skill_level,
        passStatus: summary.pass_status,

        totalQuestions: summary.total_questions,
        correctAnswers: summary.correct_answers,
        incorrectAnswers: summary.incorrect_answers,
        partialAnswers: summary.partial_answers,
        accuracyRate: summary.accuracy_rate,

        timeSpent: summary.total_time_spent,
        avgTimePerQuestion: summary.avg_time_per_question,

        categoryScores: summary.category_scores,
        difficultyScores: summary.difficulty_scores,
        difficultyStats: summary.difficulty_scores,

        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        recommendations: summary.recommendations,
        nextSteps: summary.next_steps,
        aiConfidence: summary.ai_confidence,
        aiAnalysis: summary.assessment.ai_analysis || {},

        achievements: summary.achievements,
        badgesEarned: summary.badges_earned,

        questions: questions,
        questionResults: questions,
      },
    };
  } catch (error: any) {
    console.error("Error in getAssessmentResults:", error);
    throw new Error(error.message || "Failed to get assessment results");
  }
};

export const getAssessmentHistory = async (
  candidateId: string
): Promise<any> => {
  try {
    if (!candidateId) {
      throw new Error("Candidate ID is required");
    }

    let assessments;
    try {
      assessments = await prisma.skillAssessment.findMany({
        where: { candidate_id: candidateId, status: "COMPLETED" },
        include: {
          summary: true, 
        },
        orderBy: { completed_at: "desc" },
      });
    } catch (dbError: any) {
      console.error("Database error in getAssessmentHistory:", dbError);
      throw new Error("Database connection failed. Please try again later.");
    }

    const history = assessments.map((a, idx) => {
      const overallScore = a.summary?.overall_score || a.overall_score || 0;
      const skillLevel =
        a.summary?.skill_level || a.skill_level_result || "BEGINNER";
      const correctAnswers = a.summary?.correct_answers || 0;
      const totalQuestions =
        a.summary?.total_questions || a.total_questions || 0;
      const timeSpent = a.summary?.total_time_spent || 0;

      let improvement = undefined;
      if (idx < assessments.length - 1) {
        const prevScore =
          assessments[idx + 1].summary?.overall_score ||
          assessments[idx + 1].overall_score ||
          0;
        const diff = overallScore - prevScore;
        improvement =
          diff > 0
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
      const level =
        a.summary?.skill_level || a.skill_level_result || "BEGINNER";

      if (!skillProgress[cat]) {
        skillProgress[cat] = {
          currentLevel: level,
          trend: "STABLE",
          lastScore: score,
          previousScore: undefined,
          totalAttempts: 1,
          bestScore: score,
          averageScore: score,
        };
      } else {
        skillProgress[cat].totalAttempts++;
        skillProgress[cat].previousScore = score;
        skillProgress[cat].trend =
          score > skillProgress[cat].lastScore ? "IMPROVING" : "DECLINING";
        skillProgress[cat].bestScore = Math.max(
          skillProgress[cat].bestScore,
          score
        );
        skillProgress[cat].averageScore =
          (skillProgress[cat].averageScore *
            (skillProgress[cat].totalAttempts - 1) +
            score) /
          skillProgress[cat].totalAttempts;
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
          averageScore:
            assessments.length > 0
              ? assessments.reduce(
                  (sum, a) =>
                    sum + (a.summary?.overall_score || a.overall_score || 0),
                  0
                ) / assessments.length
              : 0,
          totalTimeSpent: history.reduce((sum, h) => sum + h.timeSpent, 0),
        },
      },
    };
  } catch (error: any) {
    console.error("Error in getAssessmentHistory:", error);
    throw new Error(error.message || "Failed to get assessment history");
  }
};

export const getRecommendations = async (candidateId: string) => {
  try {
    const latestAssessment = await prisma.skillAssessment.findFirst({
      where: { 
        candidate_id: candidateId,
        status: 'COMPLETED'
      },
      orderBy: { completed_at: 'desc' },
      include: { 
        summary: true
      }
    });

    if (!latestAssessment) {
      return {
        success: false,
        message: 'No completed assessments found. Please complete an assessment first.',
        data: { 
          recommendations: [],
          nextSteps: [],
          strengths: [],
          weaknesses: [],
          learningPath: []
        }
      };
    }

    if (!latestAssessment.summary) {
      return {
        success: false,
        message: 'Assessment summary not available. Please contact support.',
        data: { 
          recommendations: [],
          nextSteps: [],
          strengths: [],
          weaknesses: [],
          learningPath: []
        }
      };
    }
    
    return {
      success: true,
      data: {
        recommendations: latestAssessment.summary.recommendations || [],
        nextSteps: latestAssessment.summary.next_steps || [],
        
        strengths: latestAssessment.summary.strengths || [],
        weaknesses: latestAssessment.summary.weaknesses || [],
        
        assessmentId: latestAssessment.assessment_id,
        skillCategory: latestAssessment.skill_category,
        skillLevel: latestAssessment.summary.skill_level,
        overallScore: latestAssessment.summary.overall_score,
        completedAt: latestAssessment.completed_at,
        
        learningPath: (latestAssessment.summary.recommendations || []).map((rec: string, idx: number) => ({
          step: idx + 1,
          recommendation: rec,
          priority: idx === 0 ? 'HIGH' : idx === 1 ? 'MEDIUM' : 'LOW',
          estimatedTime: '1-2 weeks',
          category: latestAssessment.skill_category
        }))
      },
      message: 'Recommendations retrieved successfully'
    };
    
  } catch (error: any) {
    console.error('Error in getRecommendations:', error);
    throw new Error(error.message || 'Failed to fetch recommendations');
  }
};

const getFallbackQuestions = (
  skillCategory: string,
  difficulty: string,
  count: number
): Question[] => {
  const fallbackQuestions: Question[] = [
    {
      questionId: "fallback_1",
      questionText: `What is your experience level with ${skillCategory}?`,
      type: QuestionType.MCQ,
      options: ["Beginner", "Intermediate", "Advanced", "Expert"],
      correctAnswer: "Intermediate",
      difficulty: difficulty as any,
      timeLimit: 90,
      aiGenerated: false,
      adaptedReason: "Fallback question due to AI service unavailability",
    },
  ];

  return Array(count)
    .fill(0)
    .map((_, idx) => ({
      ...fallbackQuestions[0],
      questionId: `fallback_${idx + 1}`,
      questionText: `Question ${idx + 1}: Basic ${skillCategory} knowledge check`,
    }));
};

const getFallbackEvaluation = (question: Question, answer: string): any => {
  return {
    score: 70,
    feedback:
      "Answer recorded. Detailed evaluation unavailable due to service limitations.",
    strengths: ["Answer provided"],
    improvements: ["Detailed analysis pending"],
    confidence: 50,
    isCorrect: true,
  };
};

function generateFallbackReport(params: {
  skillCategory: string;
  overallScore: number;
  skillLevel: string;
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  difficultyStats: Record<string, { correct: number; total: number }>;
}): any {
  const { 
    skillCategory, 
    overallScore, 
    skillLevel, 
    correctAnswers, 
    incorrectAnswers, 
    totalQuestions, 
    difficultyStats 
  } = params;
  
  const strengths: string[] = [];
  if (difficultyStats.BEGINNER.correct === difficultyStats.BEGINNER.total && difficultyStats.BEGINNER.total > 0) {
    strengths.push(`Strong foundation in ${skillCategory} fundamentals`);
  }
  if (overallScore >= 80) {
    strengths.push(`High accuracy across all difficulty levels`);
  }
  if (difficultyStats.ADVANCED.correct > 0) {
    strengths.push(`Capable of handling advanced ${skillCategory} challenges`);
  }
  if (strengths.length === 0) {
    strengths.push(`Completed ${skillCategory} assessment successfully`);
  }
  
  const weaknesses: string[] = [];
  if (incorrectAnswers > totalQuestions * 0.3) {
    weaknesses.push(`Review ${skillCategory} core concepts`);
  }
  if (difficultyStats.INTERMEDIATE.total > 0 && difficultyStats.INTERMEDIATE.correct < difficultyStats.INTERMEDIATE.total * 0.6) {
    weaknesses.push(`Strengthen intermediate ${skillCategory} knowledge`);
  }
  if (difficultyStats.ADVANCED.total > 0 && difficultyStats.ADVANCED.correct === 0) {
    weaknesses.push(`Advanced ${skillCategory} topics need practice`);
  }
  if (weaknesses.length === 0) {
    weaknesses.push(`Minor improvements possible in advanced areas`);
  }
  
  const recommendations: string[] = [];
  if (overallScore < 70) {
    recommendations.push(`Take a structured ${skillCategory} course`);
    recommendations.push(`Practice with real-world ${skillCategory} projects`);
    recommendations.push(`Review fundamentals and core concepts daily`);
  } else if (overallScore < 85) {
    recommendations.push(`Apply ${skillCategory} skills in practical projects`);
    recommendations.push(`Study advanced ${skillCategory} patterns`);
    recommendations.push(`Join ${skillCategory} developer communities`);
  } else {
    recommendations.push(`Share your ${skillCategory} knowledge through mentoring`);
    recommendations.push(`Explore specialized ${skillCategory} topics`);
    recommendations.push(`Contribute to open-source ${skillCategory} projects`);
  }
  
  const nextSteps: string[] = [];
  if (skillLevel === 'EXPERT') {
    nextSteps.push(`Apply for senior ${skillCategory} positions`);
    nextSteps.push(`Contribute to open-source projects`);
    nextSteps.push(`Consider technical leadership roles`);
  } else if (skillLevel === 'ADVANCED') {
    nextSteps.push(`Build advanced portfolio projects`);
    nextSteps.push(`Target mid-level professional roles`);
    nextSteps.push(`Network with industry professionals`);
  } else if (skillLevel === 'INTERMEDIATE') {
    nextSteps.push(`Complete 2-3 ${skillCategory} projects`);
    nextSteps.push(`Apply for junior positions`);
    nextSteps.push(`Join ${skillCategory} communities`);
  } else {
    nextSteps.push(`Complete comprehensive training`);
    nextSteps.push(`Practice daily for 2-3 months`);
    nextSteps.push(`Retake assessment after improvement`);
  }
  
  return {
    overallScore,
    skillLevel,
    strengths,
    weaknesses,
    recommendations,
    nextSteps,
    confidenceScore: 70
  };
}

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
  if (score === 100) achievements.push('Perfect Score');
  if (score >= 90) achievements.push('Excellence Award');
  if (correct === total) achievements.push('Flawless Performance');
  return achievements;
}

function generateBadges(score: number, level: string): string[] {
  const badges: string[] = [];
  if (score >= 90) badges.push('Gold Badge');
  else if (score >= 75) badges.push('Silver Badge');
  else if (score >= 60) badges.push('Bronze Badge');
  if (level === 'EXPERT') badges.push('Expert Level');
  return badges;
}
