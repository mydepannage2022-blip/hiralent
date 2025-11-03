// frontend/app/candidate/dashboard/skills-assessment/test/[assessmentId]/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import SecurityMonitorWrapper from '@/src/components/candidate/dashboard/skills-assessment/SecurityMonitorWrapper';
import QuestionTimer from '@/src/components/candidate/dashboard/skills-assessment/QuestionTimer';
import ProgressBar from '@/src/components/candidate/dashboard/skills-assessment/ProgressBar';
import QuestionCard from '@/src/components/candidate/dashboard/skills-assessment/QuestionCard';
import {
  useGetNextQuestion,
  useSubmitAnswer,
  useCompleteAssessment,
  useAssessmentProgress
} from '@/src/lib/profile/assessment.queries';
import { useProfile } from '@/src/context/ProfileContext';
import { Question, SecurityViolation } from '@/src/types/assessment.types';

const AssessmentTestPage = () => {
  const router = useRouter();
  const params = useParams();
  // Guard useParams() which can be null/undefined in some Next runtime/type contexts
  const assessmentId = params?.assessmentId ? String(params.assessmentId) : '';

  // REAL API STATE
  const { assessmentState, updateAssessmentProgress } = useProfile();

  // Local state
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [violations, setViolations] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // REAL API HOOKS ONLY
  const { 
    data: questionData, 
    isLoading: isLoadingQuestion,
    error: questionError,
    refetch: refetchQuestion
  } = useGetNextQuestion(assessmentId, Boolean(assessmentId));

  const { 
    data: progressData,
    isLoading: isLoadingProgress 
  } = useAssessmentProgress(assessmentId, Boolean(assessmentId));

  const submitAnswerMutation = useSubmitAnswer();
  const completeAssessmentMutation = useCompleteAssessment();

  // Redirect if no assessment ID
  useEffect(() => {
    if (!assessmentId) {
      toast.error('Assessment ID not found');
      if (typeof window !== 'undefined') router.push('/candidate/dashboard/skills-assessment');
      return;
    }
  }, [assessmentId, router]);

  // Update current question when API data changes
  useEffect(() => {
    if (questionData?.success && questionData.data.question) {
      setCurrentQuestion(questionData.data.question);
      setSelectedAnswer('');
      setIsSubmitted(false);
      setQuestionStartTime(Date.now());
    }
  }, [questionData]);

  // Handle question loading error
  useEffect(() => {
    if (questionError) {
      console.error('Question error:', questionError);
      
      if (questionError.message.includes('No more questions') || 
          questionError.message.includes('Assessment complete')) {
        handleCompleteAssessment();
      } else if (questionError.message.includes('Assessment not found')) {
        toast.error('Assessment not found');
        router.push('/candidate/dashboard/skills-assessment');
      } else {
        toast.error('Failed to load question. Please try again.');
      }
    }
  }, [questionError]);

  // Handle violations
  const handleSecurityViolation = (violation: SecurityViolation) => {
    setViolations(prev => prev + 1);
    toast.error(`Security violation: ${violation.details}`);
    
    if (violations >= 2) {
      toast.error('Too many violations. Assessment terminated.');
      router.push('/candidate/dashboard/skills-assessment');
    }
  };

  // Handle answer selection
  const handleAnswerChange = (answer: string | string[]) => {
    if (!isSubmitted) {
      setSelectedAnswer(answer as string);
    }
  };

  // Handle answer submission - REAL API ONLY
  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || isSubmitted || !currentQuestion) return;

    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
    setIsSubmitted(true);
    setIsLoading(true);

    try {
      await submitAnswerMutation.mutateAsync({
        assessmentId,
        answerData: {
          questionId: currentQuestion.questionId,
          answer: selectedAnswer,
          timeTaken
        }
      });

      toast.success('Answer submitted successfully!');
      
      // Wait before loading next question
      setTimeout(() => {
        refetchQuestion();
        setIsLoading(false);
      }, 1500);

    } catch (error: any) {
      console.error('Submit answer error:', error);
      setIsSubmitted(false);
      setIsLoading(false);
      
      if (error.message.includes('Assessment complete')) {
        handleCompleteAssessment();
      } else if (error.message.includes('Time limit exceeded')) {
        toast.error('Time limit exceeded for this question');
        setTimeout(() => refetchQuestion(), 1000);
      } else {
        toast.error(error.message || 'Failed to submit answer');
      }
    }
  };

  // Handle time up - REAL API ONLY
  const handleTimeUp = async () => {
    if (!isSubmitted && currentQuestion) {
      const timeTaken = currentQuestion.timeLimit;
      
      toast((t) => (
        <div className="flex items-center gap-2">
          <span>Time expired! Auto-submitting answer...</span>
        </div>
      ), {
        duration: 2000,
        style: {
          background: '#f59e0b',
          color: 'white'
        }
      });

      setIsSubmitted(true);
      setIsLoading(true);

      try {
        await submitAnswerMutation.mutateAsync({
          assessmentId,
          answerData: {
            questionId: currentQuestion.questionId,
            answer: selectedAnswer || '', // Submit whatever is selected or empty
            timeTaken
          }
        });

        setTimeout(() => {
          refetchQuestion();
          setIsLoading(false);
        }, 1500);

      } catch (error: any) {
        console.error('Time up submit error:', error);
        if (error.message.includes('Assessment complete')) {
          handleCompleteAssessment();
        } else {
          setIsLoading(false);
          toast.error('Failed to auto-submit answer');
        }
      }
    }
  };

  // Handle assessment completion - REAL API ONLY
  const handleCompleteAssessment = async () => {
    setIsLoading(true);
    
    try {
      const result = await completeAssessmentMutation.mutateAsync(assessmentId);
      
      if (result.success) {
        toast.success('Assessment completed successfully!');
        
        // Update context state
        updateAssessmentProgress({
          currentQuestionIndex: 0,
          timeElapsed: 0
        });
        
        // Navigate to results page
        router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
      } else {
        throw new Error(result.message || 'Failed to complete assessment');
      }
    } catch (error: any) {
      console.error('Complete assessment error:', error);
      toast.error(error.message || 'Failed to complete assessment');
      setIsLoading(false);
    }
  };

  // Prevent page refresh during assessment
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your assessment progress will be lost.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      const confirmLeave = window.confirm('Are you sure you want to leave the assessment? Your progress will be lost.');
      
      if (!confirmLeave) {
        window.history.pushState(null, '', window.location.pathname);
      } else {
        router.push('/candidate/dashboard/skills-assessment');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.pathname);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router]);

  // LOADING STATE
  if ((isLoadingQuestion && !currentQuestion) || (!currentQuestion && !questionError)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#222] font-medium">Loading your assessment...</p>
          <p className="text-sm text-[#757575] mt-2">Please wait while we prepare your questions</p>
        </div>
      </div>
    );
  }

  // ERROR STATE - No fallback to mock
  if (!currentQuestion && questionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[#222] mb-2">Assessment Unavailable</h2>
          <p className="text-[#757575] mb-4">
            We couldn't load your assessment. This might be due to:
          </p>
          <ul className="text-sm text-[#757575] mb-6 text-left">
            <li>• Assessment has already been completed</li>
            <li>• Session has expired</li>
            <li>• Network connectivity issues</li>
            <li>• Assessment not found</li>
          </ul>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/candidate/dashboard/skills-assessment')}
              className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
            >
              Back to Assessments
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-gray-300 text-[#757575] rounded-md hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = questionData?.data.totalQuestions || progressData?.data.totalQuestions || 25;
  const currentQuestionIndex = questionData?.data.currentIndex || (progressData?.data.currentQuestion ? progressData.data.currentQuestion - 1 : 0);
  const isLastQuestion = !questionData?.data.hasNext || 
                        (progressData?.data.currentQuestion === progressData?.data.totalQuestions);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Security Monitor */}
      <SecurityMonitorWrapper
        isMonitoring={true}
        onViolation={handleSecurityViolation}
        maxViolations={3}
        position="top-right"
      />

      {/* Header with Timer and Progress */}
      <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-[#222]">
                Assessment in Progress
              </h1>
              <span className="text-sm text-[#757575]">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              {violations > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-md">
                  {violations} violation{violations > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {currentQuestion && (
              <QuestionTimer
                totalTime={currentQuestion.timeLimit}
                onTimeUp={handleTimeUp}
                isPaused={isSubmitted}
                size="small"
              />
            )}
          </div>

          <div className="mt-4">
            <ProgressBar
              currentQuestion={currentQuestionIndex + 1}
              totalQuestions={totalQuestions}
              variant="simple"
              className="bg-transparent border-0 p-0"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 px-4">
        {currentQuestion && (
          <motion.div
            key={currentQuestion.questionId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <QuestionCard
              question={{
                id: currentQuestion.questionId,
                questionText: currentQuestion.questionText,
                type: currentQuestion.type,
                options: currentQuestion.options,
                timeLimit: currentQuestion.timeLimit,
                difficulty: currentQuestion.difficulty,
                category: currentQuestion.category
              }}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              selectedAnswer={selectedAnswer}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleSubmitAnswer}
              isSubmitted={isSubmitted}
              isLoading={isLoading}
            />
          </motion.div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#757575]">
            {isSubmitted ? (
              <>
                Answer submitted! {isLastQuestion ? 'Completing assessment...' : 'Loading next question...'}
              </>
            ) : (
              <>
                Read the question carefully and select your best answer. 
                Questions are automatically submitted when time expires.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      {(isLoading || completeAssessmentMutation.isPending || submitAnswerMutation.isPending) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-8 h-8 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#222] font-medium">
              {isLastQuestion ? 'Completing Assessment...' : 
               submitAnswerMutation.isPending ? 'Submitting Answer...' :
               'Processing...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentTestPage;