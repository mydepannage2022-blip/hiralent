// frontend/src/lib/assessment.queries.ts

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  startAssessment,
  getNextQuestion,
  submitAnswer,
  getAssessmentProgress,
  completeAssessment,
  getAssessmentResults,
  getAssessmentHistory,
  getSkillRecommendations,
  handleAssessmentError
} from './assessment.api';
import {
  StartAssessmentRequest,
  SubmitAnswerRequest,
  CurrentAssessment,
  AssessmentHistory,
  SkillRecommendations
} from '../../types/assessment.types';
import { useProfile } from '../../context/ProfileContext';


// ==================== MAIN ASSESSMENT HOOKS ====================

export const useStartAssessment = () => {
  const router = useRouter();
  const { setAssessmentState } = useProfile();

  return useMutation({
    mutationFn: startAssessment,
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.message || 'Failed to start assessment');
        return;
      }

      const currentAssessment: CurrentAssessment = {
        assessmentId: data.data.assessmentId,
        skillCategory: data.data.skillCategory,
        assessmentType: data.data.assessmentType,
        totalQuestions: data.data.totalQuestions,
        currentQuestionIndex: 0,
        timeElapsed: 0,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
      };

      setAssessmentState({
        currentAssessment,
        loading: false,
        error: null
      });

      toast.success('Assessment started successfully!');
      router.push(`/candidate/dashboard/skills-assessment/test/${data.data.assessmentId}`);
    },
    onError: (error: any) => {
      console.error('Start assessment failed:', error);
      const errorMsg = error.message || 'Failed to start assessment';
      toast.error(errorMsg);
      
      setAssessmentState({
        loading: false,
        error: errorMsg
      });
    },
  });
};

export const useGetNextQuestion = (assessmentId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['assessment-question', assessmentId],
    queryFn: () => getNextQuestion(assessmentId),
    enabled: enabled && !!assessmentId,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('No more questions')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
};

export const useSubmitAnswer = () => {
  const queryClient = useQueryClient();
  const { updateAssessmentProgress } = useProfile();

  return useMutation({
    mutationFn: ({ assessmentId, answerData }: { 
      assessmentId: string; 
      answerData: SubmitAnswerRequest 
    }) => submitAnswer(assessmentId, answerData),
    
    onSuccess: (data, variables) => {
      if (!data.success) {
        toast.error(data.message || 'Failed to submit answer');
        return;
      }

      updateAssessmentProgress({
        currentQuestionIndex: data.data.currentIndex + 1,
        timeElapsed: variables.answerData.timeTaken
      });

      if (data.data.feedback) {
        const feedbackType = data.data.isCorrect ? 'success' : 'error';
        toast[feedbackType](`${data.data.score}% - ${data.data.feedback}`, {
          duration: 2000
        });
      }

      queryClient.invalidateQueries({ 
        queryKey: ['assessment-question', variables.assessmentId] 
      });
    },
    
    onError: (error: any) => {
      console.error('Submit answer failed:', error);
      const errorMsg = error.message || 'Failed to submit answer';
      toast.error(errorMsg);
    },
  });
};

export const useCompleteAssessment = () => {
  const router = useRouter();
  const { clearAssessmentState } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeAssessment,
    onSuccess: (data, assessmentId) => {
      if (!data.success) {
        toast.error(data.message || 'Failed to complete assessment');
        return;
      }

      toast.success('Assessment completed successfully!');
      
      clearAssessmentState();
      
      queryClient.invalidateQueries({ queryKey: ['assessment-history'] });
      queryClient.invalidateQueries({ queryKey: ['profile-completeness'] });
      
      router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
    },
    onError: (error: any) => {
      console.error('Complete assessment failed:', error);
      toast.error(error.message || 'Failed to complete assessment');
    },
  });
};

// ==================== PROGRESS & RESULTS HOOKS ====================

export const useAssessmentProgress = (assessmentId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['assessment-progress', assessmentId],
    queryFn: () => getAssessmentProgress(assessmentId),
    enabled: enabled && !!assessmentId,
    refetchInterval: 30000,
    staleTime: 25000,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useAssessmentResults = (assessmentId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['assessment-results', assessmentId],
    queryFn: () => getAssessmentResults(assessmentId),
    enabled: enabled && !!assessmentId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('not completed')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 2000,
  });
};

// ==================== HISTORY & RECOMMENDATIONS HOOKS - FINAL FIX ====================

export const useAssessmentHistory = () => {
  const { setAssessmentState } = useProfile();

  // Clean useQuery without deprecated properties
  const query = useQuery({
    queryKey: ['assessment-history'],
    queryFn: getAssessmentHistory,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });

  // Handle success in useEffect
  useEffect(() => {
    if (query.data && (query.data as any)?.success && (query.data as any).data.assessments) {
      setAssessmentState({
        assessmentHistory: (query.data as any).data.assessments
      });
    }
  }, [query.data, setAssessmentState]);

  // Handle errors in useEffect
  useEffect(() => {
    if (query.error) {
      const error = query.error as any;
      if (error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
        toast.error('Please log in to view assessment history');
        return;
      }
      console.error('Failed to load assessment history:', error);
    }
  }, [query.error]);

  return query;
};

export const useSkillRecommendations = () => {
  const { setAssessmentState } = useProfile();

  // Clean useQuery without deprecated properties
  const query = useQuery({
    queryKey: ['skill-recommendations'],
    queryFn: getSkillRecommendations,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });

  // Handle success in useEffect
  useEffect(() => {
    if (query.data && (query.data as any)?.success && (query.data as any).data.recommendations) {
      setAssessmentState({
        skillRecommendations: (query.data as any).data.recommendations
      });
    }
  }, [query.data, setAssessmentState]);

  // Handle errors in useEffect
  useEffect(() => {
    if (query.error) {
      console.error('Failed to load skill recommendations:', query.error);
      toast.error('Failed to load skill recommendations');
    }
  }, [query.error]);

  return query;
};

// ==================== UTILITY HOOKS ====================

export const useAssessmentTimer = (
  initialTime: number,
  onTimeUp?: () => void,
  isPaused: boolean = false
) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isActive, setIsActive] = useState(!isPaused);

  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  useEffect(() => {
    setIsActive(!isPaused);
  }, [isPaused]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            onTimeUp?.();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, onTimeUp]);

  return {
    timeRemaining,
    isActive,
    progress: ((initialTime - timeRemaining) / initialTime) * 100
  };
};

// ==================== ERROR HANDLING ====================

export const handleAssessmentQueryError = (error: any, context: string) => {
  console.error(`${context} error:`, context);
  
  if (error?.response?.status === 401) {
    return;
  }
  
  const errorData = handleAssessmentError(error);
  toast.error(errorData.message);
  
  return errorData;
};