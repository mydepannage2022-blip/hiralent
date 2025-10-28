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
      SkillRecommendations,
      QuestionOption,
    } from '../../types/assessment.types';
    import { useProfile } from '../../context/ProfileContext';


    // ==================== MAIN ASSESSMENT HOOKS ====================
  const transformOptions = (options?: string[] | any[]): QuestionOption[] => {
    if (!options || !Array.isArray(options)) return [];
    
    // Already in correct format with nested text
    if (options.length > 0 && typeof options[0] === 'object' && 'text' in options[0]) {
      return options.map((opt, idx) => ({
        id: opt.id || `opt-${idx + 1}`,
        text: typeof opt.text === 'string' ? opt.text : opt.text.text  // Handle nested
      }));
    }
    
    // Simple string array
    return options.map((opt, idx) => ({
      id: `opt-${idx + 1}`,
      text: opt
    }));
  };

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

    setAssessmentState({
      currentAssessment: {
        assessmentId: data.data.assessmentId,
        skillCategory: data.data.skillCategory,
        assessmentType: data.data.assessmentType,
        totalQuestions: data.data.totalQuestions,
        currentQuestionIndex: 0,
        timeElapsed: 0,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString()
      },
      currentQuestion: data.data.firstQuestion ? {
        questionId: data.data.firstQuestion.questionId,
        questionText: data.data.firstQuestion.questionText,
        type: data.data.firstQuestion.type as 'MCQ' | 'CODING' | 'ESSAY' | 'TRUE_FALSE' | 'SCENARIO',
        options: transformOptions(data.data.firstQuestion.options),  // ✅ Same function
        timeLimit: data.data.firstQuestion.timeLimit,
        difficulty: 'INTERMEDIATE' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT',
        category: data.data.skillCategory
      } : null
    });

    toast.success('Assessment started successfully!');
    router.push(`/candidate/dashboard/skills-assessment/test/${data.data.assessmentId}`);
  },
      
      onError: (error: any) => {
        console.error('Start assessment failed:', error);
        
        if (error?.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          router.push('/auth/login');
        } else if (error?.response?.status === 400) {
          toast.error(error?.response?.data?.message || 'Invalid assessment data');
        } else if (error.message?.includes('No questions available')) {
          toast.error('No questions available for this skill. Please try another skill.');
        } else if (error.message?.includes('Assessment already in progress')) {
          toast.error('You already have an assessment in progress.');
        } else {
          toast.error(error.message || 'Failed to start assessment. Please try again.');
        }
      }
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
  const router = useRouter(); 
  const queryClient = useQueryClient();
  const { updateAssessmentProgress, assessmentState, setAssessmentState } = useProfile();

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

      const currentTime = assessmentState.currentAssessment?.timeElapsed || 0;
      
      updateAssessmentProgress({
        currentQuestionIndex: data.data.currentIndex + 1,
        timeElapsed: currentTime + variables.answerData.timeTaken
      });

      if (data.data.isLastQuestion || !data.data.nextQuestion) {
        setAssessmentState({ currentQuestion: null });
        
        // ✅ Show processing message
        toast.success('Assessment completed! Processing results...', {
          duration: 3000
        });
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['assessment-history'] });
        queryClient.invalidateQueries({ queryKey: ['profile-completeness'] });
        
        // ✅ REDIRECT TO COMPLETE PAGE (NOT RESULTS)
        setTimeout(() => {
          router.push(`/candidate/dashboard/skills-assessment/complete/${variables.assessmentId}`);
        }, 1500);
        
      } else if (data.data.nextQuestion) {
        setAssessmentState({
          currentQuestion: {
            questionId: data.data.nextQuestion.questionId,
            questionText: data.data.nextQuestion.questionText,
            type: data.data.nextQuestion.type as 'MCQ' | 'CODING' | 'ESSAY' | 'TRUE_FALSE' | 'SCENARIO' | 'SHORT_ANSWER',
            options: transformOptions(data.data.nextQuestion.options),
            timeLimit: data.data.nextQuestion.timeLimit,
            difficulty: 'INTERMEDIATE' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT',
            category: assessmentState.currentAssessment?.skillCategory || ''
          }
        });
      }

      if (data.data.feedback) {
        const feedbackType = data.data.isCorrect ? 'success' : 'error';
        toast[feedbackType](`${data.data.score}% - ${data.data.feedback}`, {
          duration: 2000
        });
      }
    },
        
    onError: (error: any) => {
      console.error('Submit answer failed:', error);
      
      if (error.message?.includes('Assessment complete')) {
        return;
      } else if (error.message?.includes('Time limit exceeded')) {
        toast.error('Time limit exceeded for this question');
      } else {
        toast.error(error.message || 'Failed to submit answer');
      }
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
  const [isReady, setIsReady] = useState(false);
  return useQuery({
    queryKey: ['assessment-results', assessmentId],
    queryFn: () => getAssessmentResults(assessmentId),
    enabled: enabled && !!assessmentId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
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

      const query = useQuery({
        queryKey: ['assessment-history'],
        queryFn: getAssessmentHistory,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: 1000
      });

      useEffect(() => {
        if (query.data && (query.data as any)?.success && (query.data as any).data.assessments) {
          setAssessmentState({
            assessmentHistory: (query.data as any).data.assessments
          });
        }
      }, [query.data]); // ✅ Only query.data

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

      const query = useQuery({
        queryKey: ['skill-recommendations'],
        queryFn: getSkillRecommendations,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: 1000
      });

      // ✅ FIX: Remove setAssessmentState from deps
      useEffect(() => {
        if (query.data && (query.data as any)?.success && (query.data as any).data.recommendations) {
          setAssessmentState({
            skillRecommendations: (query.data as any).data.recommendations
          });
        }
      }, [query.data]); // ✅ Only query.data

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