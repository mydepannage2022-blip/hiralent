import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// ==================== ASSESSMENT OWNERSHIP VALIDATION ====================

export const validateAssessmentOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessmentId = req.params.assessmentId;
    const candidateId = req.user?.user_id;

    if (!assessmentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Assessment ID is required' 
      });
    }

    if (!candidateId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Check if assessment belongs to the requesting user
    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
      select: { 
        candidate_id: true, 
        assessment_id: true,
        status: true 
      }
    });

    if (!assessment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assessment not found' 
      });
    }

    if (assessment.candidate_id !== candidateId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Assessment belongs to another user.' 
      });
    }

    // Store assessment data for downstream middlewares
    req.assessment = assessment;
    next();

  } catch (error) {
    console.error('Assessment ownership validation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during assessment validation' 
    });
  }
};

// ==================== ASSESSMENT STATUS VALIDATION ====================

export const checkAssessmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessmentId = req.params.assessmentId;
    const operation = getOperationFromRoute(req.route?.path || req.path);

    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
      select: { 
        status: true, 
        completed_at: true,
        started_at: true,
        time_limit: true 
      }
    });

    if (!assessment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assessment not found' 
      });
    }

    // Check if operation is allowed for current status
    const statusValidation = validateStatusForOperation(assessment.status, operation);
    if (!statusValidation.allowed) {
      return res.status(400).json({ 
        success: false, 
        error: statusValidation.message 
      });
    }

    // Check for time expiry
    if (assessment.status === 'IN_PROGRESS' && assessment.started_at && assessment.time_limit) {
      const timeElapsed = (Date.now() - new Date(assessment.started_at).getTime()) / 1000;
      const timeLimit = assessment.time_limit * 60; // Convert minutes to seconds

      if (timeElapsed > timeLimit) {
        // Auto-expire the assessment
        await prisma.skillAssessment.update({
          where: { assessment_id: assessmentId },
          data: { 
            status: 'EXPIRED',
            completed_at: new Date()
          }
        });

        return res.status(410).json({ 
          success: false, 
          error: 'Assessment has expired due to time limit',
          timeElapsed: Math.round(timeElapsed),
          timeLimit: timeLimit
        });
      }
    }

    next();

  } catch (error) {
    console.error('Assessment status check error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during status validation' 
    });
  }
};

// ==================== QUESTION SUBMISSION VALIDATION ====================

export const validateQuestionSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessmentId = req.params.assessmentId;
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question ID is required' 
      });
    }

    const assessment = await prisma.skillAssessment.findUnique({
      where: { assessment_id: assessmentId },
      select: { 
        current_question: true, 
        questions: true,
        status: true 
      }
    });

    if (!assessment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assessment not found' 
      });
    }

    // Parse questions array
    const questions = Array.isArray(assessment.questions) 
      ? assessment.questions as any[] 
      : [];

    if (questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No questions found for this assessment' 
      });
    }

    const currentIndex = assessment.current_question;
    const currentQuestion = questions[currentIndex];

    if (!currentQuestion) {
      return res.status(400).json({ 
        success: false, 
        error: 'No more questions available' 
      });
    }

    // Validate question ID matches current question
    const expectedQuestionId = currentQuestion.questionId || `q${currentIndex + 1}`;
    if (questionId !== expectedQuestionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid question ID or answers submitted out of sequence',
        expected: expectedQuestionId,
        received: questionId
      });
    }

    // Store question data for downstream use
    req.currentQuestion = currentQuestion;
    req.questionIndex = currentIndex;
    
    next();

  } catch (error) {
    console.error('Question submission validation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during question validation' 
    });
  }
};

// ==================== TIME LIMIT VALIDATION ====================

export const validateTimeLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeTaken } = req.body;
    const currentQuestion = req.currentQuestion;

    if (timeTaken === undefined || timeTaken < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid time taken is required' 
      });
    }

    // Get question time limit (default 90 seconds)
    const questionTimeLimit = currentQuestion?.timeLimit || 90;
    const bufferTime = 10; // 10 second buffer for network delays

    // Check if time taken exceeds limit with buffer
    if (timeTaken > (questionTimeLimit + bufferTime)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Answer submitted after time limit',
        timeLimit: questionTimeLimit,
        timeTaken: timeTaken,
        allowedTime: questionTimeLimit + bufferTime
      });
    }

    // Warn if time is suspicious (too fast)
    if (timeTaken < 5) {
      console.warn(`Suspiciously fast answer: ${timeTaken}s for question ${currentQuestion?.questionId}`);
    }

    next();

  } catch (error) {
    console.error('Time limit validation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during time validation' 
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

function getOperationFromRoute(routePath: string): string {
  if (routePath.includes('/question')) return 'GET_QUESTION';
  if (routePath.includes('/answer')) return 'SUBMIT_ANSWER';
  if (routePath.includes('/complete')) return 'COMPLETE_ASSESSMENT';
  if (routePath.includes('/progress')) return 'GET_PROGRESS';
  if (routePath.includes('/results')) return 'GET_RESULTS';
  return 'UNKNOWN';
}

function validateStatusForOperation(status: string, operation: string): { allowed: boolean; message: string } {
  const rules = {
    'GET_QUESTION': ['PENDING', 'IN_PROGRESS'],
    'SUBMIT_ANSWER': ['PENDING', 'IN_PROGRESS'],
    'COMPLETE_ASSESSMENT': ['IN_PROGRESS', 'PENDING'],
    'GET_PROGRESS': ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    'GET_RESULTS': ['COMPLETED']
  };

  const allowedStatuses = rules[operation as keyof typeof rules] || [];
  
  if (allowedStatuses.includes(status)) {
    return { allowed: true, message: '' };
  }

  const messages = {
    'COMPLETED': 'Assessment is already completed',
    'EXPIRED': 'Assessment has expired',
    'CANCELLED': 'Assessment has been cancelled',
    'PENDING': 'Assessment has not been started yet',
    'IN_PROGRESS': 'Assessment is currently in progress'
  };

  return { 
    allowed: false, 
    message: messages[status as keyof typeof messages] || `Operation not allowed for status: ${status}` 
  };
}

// ==================== TYPE EXTENSIONS ====================

declare global {
  namespace Express {
    interface Request {
      assessment?: {
        candidate_id: string;
        assessment_id: string;
        status: string;
      };
      currentQuestion?: any;
      questionIndex?: number;
    }
  }
}
