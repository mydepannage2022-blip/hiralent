'use client';

import { useState, useCallback, useRef } from 'react';
import {
  startInterview,
  submitResponse as submitResponseApi,
  endInterview,
} from '../../lib/interview/interview.api';
import type {
  InterviewSessionResponse,
  InterviewQuestion,
} from '../../types/interview.types';

export type InterviewPhase =
  | 'idle'           // Not started
  | 'loading'        // Loading interview data
  | 'speaking'       // AI is speaking the question
  | 'listening'      // Candidate is responding
  | 'submitting'     // Submitting response
  | 'transitioning'  // Moving to next question
  | 'closing'        // Speaking closing message
  | 'complete'       // Interview finished
  | 'error';         // Error state

interface InterviewSessionState {
  session: InterviewSessionResponse | null;
  currentQuestion: InterviewQuestion | null;
  currentTranscript: string;
  phase: InterviewPhase;
  progress: { current: number; total: number };
  isLoading: boolean;
  error: string | null;
  startTime: Date | null;
  questionStartTime: Date | null;
}

interface UseInterviewSessionReturn extends InterviewSessionState {
  initSession: () => Promise<void>;
  setPhase: (phase: InterviewPhase) => void;
  updateTranscript: (transcript: string) => void;
  submitCurrentResponse: () => Promise<void>;
  endSession: () => Promise<void>;
  resetError: () => void;
}

export function useInterviewSession(interviewId: string): UseInterviewSessionReturn {
  const [state, setState] = useState<InterviewSessionState>({
    session: null,
    currentQuestion: null,
    currentTranscript: '',
    phase: 'idle',
    progress: { current: 0, total: 0 },
    isLoading: false,
    error: null,
    startTime: null,
    questionStartTime: null,
  });

  const questionStartTimeRef = useRef<Date | null>(null);

  // Initialize/start the interview session
  const initSession = useCallback(async () => {
    setState(prev => ({ ...prev, phase: 'loading', isLoading: true, error: null }));

    try {
      // Start the interview (generates questions and returns first one)
      // API already handles auth via interceptors and returns unwrapped data
      const sessionData = await startInterview(interviewId);
      questionStartTimeRef.current = new Date();

      setState(prev => ({
        ...prev,
        session: sessionData,
        currentQuestion: sessionData.currentQuestion || null,
        phase: 'speaking',
        progress: {
          current: sessionData.progress.questionsAsked,
          total: sessionData.progress.totalQuestions,
        },
        isLoading: false,
        startTime: new Date(),
        questionStartTime: new Date(),
      }));
    } catch (err: any) {
      console.error('Failed to start interview session:', err);
      setState(prev => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        error: err.message || 'Failed to start interview',
      }));
    }
  }, [interviewId]);

  // Set phase manually (for TTS completion, etc.)
  const setPhase = useCallback((phase: InterviewPhase) => {
    setState(prev => ({ ...prev, phase }));

    // Start timing when entering listening phase
    if (phase === 'listening') {
      questionStartTimeRef.current = new Date();
      setState(prev => ({ ...prev, questionStartTime: new Date() }));
    }
  }, []);

  // Update transcript from STT
  const updateTranscript = useCallback((transcript: string) => {
    setState(prev => ({ ...prev, currentTranscript: transcript }));
  }, []);

  // Submit current response and get next question
  const submitCurrentResponse = useCallback(async () => {
    if (!state.session || !state.currentQuestion) {
      return;
    }

    const transcript = state.currentTranscript.trim();
    if (!transcript) {
      setState(prev => ({ ...prev, error: 'Please provide a response before submitting' }));
      return;
    }

    setState(prev => ({ ...prev, phase: 'submitting', isLoading: true, error: null }));

    // Calculate response duration
    const duration = questionStartTimeRef.current
      ? Math.round((new Date().getTime() - questionStartTimeRef.current.getTime()) / 1000)
      : 0;

    try {
      console.log('📤 Submitting response for question:', state.currentQuestion.questionId);
      // API already handles auth via interceptors and returns unwrapped data
      const sessionData = await submitResponseApi(interviewId, {
        questionId: state.currentQuestion.questionId,
        responseText: transcript,
        responseDuration: duration,
      });
      console.log('📥 Response submitted. Next question:', sessionData.currentQuestion?.questionId || 'none');

      // Check if interview is complete (no more questions)
      if (sessionData.status === 'COMPLETED' || !sessionData.currentQuestion) {
        console.log('🏁 Last question answered. Preparing closing message...');

        // Set to 'closing' phase to allow closing message to be spoken
        setState(prev => ({
          ...prev,
          session: sessionData,
          currentQuestion: null,
          currentTranscript: '',
          phase: 'closing',
          isLoading: false,
        }));

        // Don't call endInterview yet - let InterviewRoom handle it after closing message
        return;
      }

      // Move to next question
      questionStartTimeRef.current = new Date();

      setState(prev => ({
        ...prev,
        session: sessionData,
        currentQuestion: sessionData.currentQuestion || null,
        currentTranscript: '',
        phase: 'speaking', // AI will speak next question
        progress: {
          current: sessionData.progress.questionsAsked,
          total: sessionData.progress.totalQuestions,
        },
        isLoading: false,
        questionStartTime: new Date(),
      }));
    } catch (err: any) {
      console.error('Failed to submit response:', err);
      setState(prev => ({
        ...prev,
        phase: 'listening', // Go back to listening phase
        isLoading: false,
        error: err.message || 'Failed to submit response',
      }));
    }
  }, [interviewId, state.session, state.currentQuestion, state.currentTranscript]);

  // End the interview early
  const endSession = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // API already handles auth via interceptors and returns unwrapped data
      await endInterview(interviewId);

      setState(prev => ({
        ...prev,
        phase: 'complete',
        isLoading: false,
      }));
    } catch (err: any) {
      console.error('Failed to end interview:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to end interview',
      }));
    }
  }, [interviewId]);

  // Reset error
  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    initSession,
    setPhase,
    updateTranscript,
    submitCurrentResponse,
    endSession,
    resetError,
  };
}
