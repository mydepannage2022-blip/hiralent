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

interface LocalQuestion {
  id: string;
  questionText: string;
  type: 'MCQ' | 'CODING' | 'ESSAY' | 'TRUE_FALSE' | 'SCENARIO';
  options?: Array<{ id: string; text: string }>;
  timeLimit: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  category: string;
}

const AssessmentTestPage = () => {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  //REAL API STATE
  const { assessmentState, updateAssessmentProgress } = useProfile();
  const { currentAssessment } = assessmentState;

  // Local state
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [violations, setViolations] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  //REAL API HOOKS
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

  //FALLBACK MOCK DATA (if API fails)
  const mockQuestions: LocalQuestion[] = [
    {
      id: 'q1',
      questionText: 'What is the correct way to create a functional component in React?',
      type: 'MCQ',
      options: [
        { id: 'a', text: 'function MyComponent() { return <div>Hello</div>; }' },
        { id: 'b', text: 'const MyComponent = () => <div>Hello</div>;' },
        { id: 'c', text: 'class MyComponent extends React.Component { render() { return <div>Hello</div>; } }' },
        { id: 'd', text: 'Both A and B are correct' }
      ],
      timeLimit: 90,
      difficulty: 'BEGINNER',
      category: 'React Basics'
    },
    {
      id: 'q2',
      questionText: 'Explain the concept of React Hooks and provide an example of useState.',
      type: 'ESSAY',
      timeLimit: 180,
      difficulty: 'INTERMEDIATE',
      category: 'React Hooks'
    },
    {
      id: 'q3',
      questionText: 'Write a function that removes duplicates from an array.',
      type: 'CODING',
      timeLimit: 300,
      difficulty: 'INTERMEDIATE',
      category: 'JavaScript'
    }
  ];

  //MOCK FALLBACK STATE
  const [mockMode, setMockMode] = useState<boolean>(false);
  const [mockQuestionIndex, setMockQuestionIndex] = useState<number>(0);

  // Redirect if no assessment ID
  useEffect(() => {
    if (!assessmentId) {
      toast.error('Assessment ID not found');
      router.push('/candidate/dashboard/skills-assessment');
      return;
    }
  }, [assessmentId, router]);

  //REAL API: Update current question when API data changes
  useEffect(() => {
    if (questionData?.success && questionData.data.question) {
      setCurrentQuestion(questionData.data.question);
      setSelectedAnswer('');
      setIsSubmitted(false);
      setQuestionStartTime(Date.now());
      setMockMode(false);
    }
  }, [questionData]);

  //FALLBACK: Use mock data if API fails
  useEffect(() => {
    if (questionError && !mockMode) {
      console.log('API failed, switching to mock mode');
      setMockMode(true);
      const mockQuestion: Question = {
        questionId: mockQuestions[mockQuestionIndex].id,
        questionText: mockQuestions[mockQuestionIndex].questionText,
        type: mockQuestions[mockQuestionIndex].type,
        options: mockQuestions[mockQuestionIndex].options,
        timeLimit: mockQuestions[mockQuestionIndex].timeLimit,
        difficulty: mockQuestions[mockQuestionIndex].difficulty,
        category: mockQuestions[mockQuestionIndex].category
      };
      setCurrentQuestion(mockQuestion);
      setSelectedAnswer('');
      setIsSubmitted(false);
      setQuestionStartTime(Date.now());
      toast.error('Using demo mode - API unavailable');
    }
  }, [questionError, mockMode, mockQuestionIndex]);

  //REAL API: Handle question loading error
  useEffect(() => {
    if (questionError && !mockMode) {
      console.error('Question error:', questionError);
      
      if (questionError.message.includes('No more questions')) {
        handleCompleteAssessment();
      } else {
        // Fallback to mock mode
        setMockMode(true);
      }
    }
  }, [questionError, mockMode]);

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

  //HYBRID: Handle answer submission (Real API + Mock fallback)
  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || isSubmitted || !currentQuestion) return;

    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
    setIsSubmitted(true);
    setIsLoading(true);

    try {
      if (mockMode) {
        //MOCK MODE: Simulate API
        console.log('Mock: Submitting answer:', {
          questionId: currentQuestion.questionId,
          answer: selectedAnswer,
          timeTaken
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Answer submitted (Demo mode)');

        setTimeout(() => {
          if (mockQuestionIndex < mockQuestions.length - 1) {
            setMockQuestionIndex(prev => prev + 1);
            setIsLoading(false);
          } else {
            handleCompleteAssessment();
          }
        }, 2000);

      } else {
        //REAL API MODE
        await submitAnswerMutation.mutateAsync({
          assessmentId,
          answerData: {
            questionId: currentQuestion.questionId,
            answer: selectedAnswer,
            timeTaken
          }
        });

        setTimeout(() => {
          refetchQuestion();
          setIsLoading(false);
        }, 2000);
      }

    } catch (error: any) {
      console.error('Submit answer error:', error);
      setIsSubmitted(false);
      setIsLoading(false);
      toast.error(error.message || 'Failed to submit answer');
    }
  };

  //HYBRID: Handle time up
  const handleTimeUp = async () => {
    if (!isSubmitted && currentQuestion) {
      const timeTaken = currentQuestion.timeLimit;
      
      toast((t) => (
        <div className="flex items-center gap-2">
          <span>Time expired! Submitting current answer...</span>
        </div>
      ), {
        duration: 2000,
        style: {
          background: '#f59e0b',
          color: 'white'
        }
      });

      if (mockMode) {
        // Mock mode time up
        setTimeout(() => {
          if (mockQuestionIndex < mockQuestions.length - 1) {
            setMockQuestionIndex(prev => prev + 1);
          } else {
            handleCompleteAssessment();
          }
        }, 1500);
      } else {
        // Real API time up
        await submitAnswerMutation.mutateAsync({
          assessmentId,
          answerData: {
            questionId: currentQuestion.questionId,
            answer: selectedAnswer || '',
            timeTaken
          }
        });

        setTimeout(() => {
          refetchQuestion();
        }, 1500);
      }
    }
  };

  //HYBRID: Handle assessment completion
  const handleCompleteAssessment = async () => {
    setIsLoading(true);
    
    try {
      if (mockMode) {
        // Mock completion
        console.log('Mock: Completing assessment:', assessmentId);
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success('Assessment completed (Demo mode)');
        router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
      } else {
        // Real API completion
        await completeAssessmentMutation.mutateAsync(assessmentId);
      }
    } catch (error: any) {
      console.error('Complete assessment error:', error);
      toast.error(error.message || 'Failed to complete assessment');
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent page refresh during assessment
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  //LOADING STATE
  if ((isLoadingQuestion && !currentQuestion) || (!currentQuestion && !mockMode)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#222] font-medium">Loading assessment...</p>
          <p className="text-sm text-[#757575] mt-2">Please wait while we prepare your questions</p>
        </div>
      </div>
    );
  }

  //ERROR STATE
  if (!currentQuestion && questionError && !mockMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[#222] mb-2">Assessment Not Available</h2>
          <p className="text-[#757575] mb-4">
            We couldn't load your assessment. Trying demo mode...
          </p>
          <button
            onClick={() => setMockMode(true)}
            className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
          >
            Continue with Demo
          </button>
        </div>
      </div>
    );
  }

  const totalQuestions = questionData?.data.totalQuestions || currentAssessment?.totalQuestions || mockQuestions.length;
  const currentQuestionIndex = questionData?.data.currentIndex || mockQuestionIndex;
  const isLastQuestion = mockMode ? 
    (mockQuestionIndex >= mockQuestions.length - 1) : 
    !questionData?.data.hasNext;

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
                Assessment in Progress {mockMode && <span className="text-orange-600">(Demo)</span>}
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
      {(isLoading || completeAssessmentMutation.isPending) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-8 h-8 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#222] font-medium">
              {isLastQuestion ? 'Completing Assessment...' : 'Processing Answer...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentTestPage;