"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import SecurityMonitor from '@/src/components/candidate/dashboard/skills-assessment/SecurityMonitor';
import QuestionTimer from '@/src/components/candidate/dashboard/skills-assessment/QuestionTimer';
import ProgressBar from '@/src/components/candidate/dashboard/skills-assessment/ProgressBar';
import QuestionCard from '@/src/components/candidate/dashboard/skills-assessment/QuestionCard';

interface Question {
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
  const assessmentId = params.id as string;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [isLoading, setIsLoading] = useState(false);
  const [violations, setViolations] = useState(0);
  const [assessmentStarted, setAssessmentStarted] = useState(false);

  // Mock questions data - replace with API call
  const mockQuestions: Question[] = [
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
    },
    {
      id: 'q4',
      questionText: 'React state updates are always synchronous.',
      type: 'TRUE_FALSE',
      options: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' }
      ],
      timeLimit: 60,
      difficulty: 'ADVANCED',
      category: 'React State'
    },
    {
      id: 'q5',
      questionText: 'You have a React application that needs to share state between multiple components. What approach would you use and why?',
      type: 'SCENARIO',
      options: [
        { id: 'a', text: 'Use Context API for global state management' },
        { id: 'b', text: 'Pass props down through component tree' },
        { id: 'c', text: 'Use a state management library like Redux' },
        { id: 'd', text: 'Lift state up to the nearest common ancestor' }
      ],
      timeLimit: 120,
      difficulty: 'ADVANCED',
      category: 'State Management'
    }
  ];

  const totalQuestions = mockQuestions.length;
  const currentQuestion = mockQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Initialize assessment on component mount
  useEffect(() => {
    if (!assessmentStarted) {
      setAssessmentStarted(true);
      setTimeRemaining(currentQuestion?.timeLimit || 90);
    }
  }, [assessmentStarted, currentQuestion]);

  // Reset timer when question changes
  useEffect(() => {
    if (currentQuestion) {
      setTimeRemaining(currentQuestion.timeLimit);
      setSelectedAnswer('');
      setIsSubmitted(false);
    }
  }, [currentQuestionIndex, currentQuestion]);

  const handleAnswerChange = (answer: string | string[]) => {
    if (!isSubmitted) {
      setSelectedAnswer(answer as string);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || isSubmitted) return;

    setIsLoading(true);
    try {
      // Mock API call to submit answer
      console.log('Submitting answer:', {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        timeTaken: currentQuestion.timeLimit - timeRemaining
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsSubmitted(true);

      // Auto-advance to next question after 2 seconds
      setTimeout(() => {
        if (isLastQuestion) {
          handleCompleteAssessment();
        } else {
          handleNextQuestion();
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleTimeUp = () => {
    if (!isSubmitted) {
      // Auto-submit with current answer or empty
      console.log('Time up - auto submitting');
      setIsSubmitted(true);
      
      setTimeout(() => {
        if (isLastQuestion) {
          handleCompleteAssessment();
        } else {
          handleNextQuestion();
        }
      }, 1000);
    }
  };

  const handleCompleteAssessment = async () => {
    setIsLoading(true);
    try {
      // Mock API call to complete assessment
      console.log('Completing assessment:', assessmentId);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      router.push(`/candidate/dashboard/skills-assessment/complete/${assessmentId}`);
    } catch (error) {
      console.error('Failed to complete assessment:', error);
      alert('Failed to complete assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityViolation = (violation: any) => {
    setViolations(prev => prev + 1);
    console.log('Security violation:', violation);
  };

  const handleTerminateAssessment = () => {
    alert('Assessment terminated due to security violations.');
    router.push('/candidate/dashboard/skills-assessment');
  };

  // Prevent page refresh/navigation during assessment
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#757575]">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Security Monitor */}
      <SecurityMonitor
        isActive={true}
        maxViolations={3}
        onViolation={handleSecurityViolation}
        onTerminate={handleTerminateAssessment}
        showWarnings={true}
        position="top-right"
      />

      {/* Header with Timer and Progress */}
      <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full p-4">
          <div className="flex items-center justify-between">
            {/* Progress Info */}
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-[#222]">
                Assessment in Progress
              </h1>
              <span className="text-sm text-[#757575]">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
            </div>

            {/* Timer */}
            <QuestionTimer
              totalTime={currentQuestion.timeLimit}
              onTimeUp={handleTimeUp}
              isPaused={isSubmitted}
              size="small"
            />
          </div>

          {/* Progress Bar */}
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
      <div className="w-full py-6">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <QuestionCard
            question={currentQuestion}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            onAnswerChange={handleAnswerChange}
            onSubmit={handleSubmitAnswer}
            isSubmitted={isSubmitted}
            timeRemaining={timeRemaining}
            isLoading={isLoading}
          />
        </motion.div>

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
                You have {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} remaining.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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