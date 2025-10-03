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
  useSubmitAnswer,           // ✅ Removed useGetNextQuestion
  useCompleteAssessment
} from '@/src/lib/profile/assessment.queries';
import { useProfile } from '@/src/context/ProfileContext';
import { SecurityViolation } from '@/src/types/assessment.types';

const AssessmentTestPage = () => {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  const { assessmentState } = useProfile();

  // ✅ Read from context instead of local state
  const currentQuestion = assessmentState.currentQuestion;

  // Local UI state only
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [violations, setViolations] = useState<number>(0);

  const submitAnswerMutation = useSubmitAnswer();
  const completeAssessmentMutation = useCompleteAssessment();

  useEffect(() => {
    if (!assessmentId) {
      toast.error('Assessment ID not found');
      router.push('/candidate/dashboard/skills-assessment');
    }
  }, [assessmentId, router]);

  useEffect(() => {
    if (currentQuestion) {
      setSelectedAnswer('');
      setIsSubmitted(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestion?.questionId]);

  useEffect(() => {
    if (!currentQuestion && assessmentState.currentAssessment && !isSubmitted) {
      const timer = setTimeout(() => {
        completeAssessmentMutation.mutate(assessmentId);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, assessmentState.currentAssessment, isSubmitted, assessmentId]);

  
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

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || isSubmitted || !currentQuestion) return;

    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
    setIsSubmitted(true);

    submitAnswerMutation.mutate({
      assessmentId,
      answerData: {
        questionId: currentQuestion.questionId,
        answer: selectedAnswer,
        timeTaken
      }
    });
  };

  const handleTimeUp = () => {
    if (!isSubmitted && currentQuestion) {
      toast('Time expired! Auto-submitting answer...', {
        duration: 2000,
        style: { background: '#f59e0b', color: 'white' }
      });

      const timeTaken = currentQuestion.timeLimit;
      setIsSubmitted(true);

      submitAnswerMutation.mutate({
        assessmentId,
        answerData: {
          questionId: currentQuestion.questionId,
          answer: selectedAnswer || '',
          timeTaken
        }
      });
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your assessment progress will be lost.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

  if (!currentQuestion) {
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

console.log('Current Question Options:', currentQuestion?.options);
  const totalQuestions = assessmentState.currentAssessment?.totalQuestions || 25;
  const currentQuestionIndex = assessmentState.currentAssessment?.currentQuestionIndex || 0;
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <SecurityMonitorWrapper
        isMonitoring={true}
        onViolation={handleSecurityViolation}
        maxViolations={3}
        position="top-right"
      />

      <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-40 rounded-md">
        <div className="p-4">
          <div className="w-full flex items-center justify-between gap-4">
            <ProgressBar
              currentQuestion={currentQuestionIndex + 1}
              totalQuestions={totalQuestions}
              variant="simple"
              className="w-3/4 bg-transparent border-0 p-0"
            />

            <QuestionTimer
              totalTime={currentQuestion.timeLimit}
              onTimeUp={handleTimeUp}
              isPaused={isSubmitted}
              size="small"
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
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
            isLoading={submitAnswerMutation.isPending}
          />
        </motion.div>

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

      {(submitAnswerMutation.isPending || completeAssessmentMutation.isPending) && (
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