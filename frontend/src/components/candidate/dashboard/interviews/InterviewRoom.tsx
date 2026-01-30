'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMediaDevices, useTextToSpeech, useSpeechToText, useInterviewSession } from '@/src/hooks/interview';
import VideoPreview from './VideoPreview';
import LiveTranscript from './LiveTranscript';
import InterviewBottomBar from './InterviewBottomBar';

interface InterviewRoomProps {
  interviewId: string;
  jobTitle?: string;
  onComplete: () => void;
  onError?: (error: string) => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'candidate';
  text: string;
  timestamp: Date;
}

const InterviewRoom: React.FC<InterviewRoomProps> = ({
  interviewId,
  jobTitle,
  onComplete,
  onError,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const prevPhaseRef = useRef<string>('idle');
  const speakingQuestionIdRef = useRef<string | null>(null);
  const questionsAskedRef = useRef<Set<string>>(new Set());
  const welcomeShownRef = useRef(false);
  const closingHandledRef = useRef(false);
  const completeHandledRef = useRef(false);

  // Custom hooks
  const {
    getStream,
    releaseStream,
  } = useMediaDevices();

  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
  } = useTextToSpeech();

  const {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    error: sttError,
  } = useSpeechToText();

  const {
    currentQuestion,
    phase,
    progress,
    isLoading,
    error: sessionError,
    startTime,
    initSession,
    setPhase,
    updateTranscript,
    submitCurrentResponse,
    endSession,
  } = useInterviewSession(interviewId);

  // Initialize media stream
  useEffect(() => {
    const initMedia = async () => {
      // Try to get stream - will request permissions if needed
      const mediaStream = await getStream();
      setStream(mediaStream);
    };
    initMedia();

    return () => {
      releaseStream();
    };
  }, [getStream, releaseStream]);

  // Initialize interview session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Add welcome message when interview starts (only on first question)
  useEffect(() => {
    if (phase === 'speaking' && !welcomeShownRef.current && currentQuestion && progress.current === 1) {
      welcomeShownRef.current = true;
      const welcomeText = 'Hello! This is an AI interview. I will ask you a series of questions to assess your skills and experience. Please answer each question clearly and take your time. Let\'s begin.';

      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: welcomeText,
          timestamp: new Date(),
        },
      ]);

      // Speak welcome message + first question together
      if (!isMuted) {
        // Mark this question as being handled to prevent duplicate TTS in phase transition
        speakingQuestionIdRef.current = currentQuestion.questionId;

        speak(welcomeText)
          .then(() => {
            console.log('✅ Welcome message finished, now speaking first question');
            // Speak the first question immediately after
            return speak(currentQuestion.questionText);
          })
          .then(() => {
            console.log('✅ First question finished, switching to listening');
            speakingQuestionIdRef.current = null;
            setPhase('listening');
          })
          .catch((err) => {
            // Check if ref is already null (user skipped)
            if (speakingQuestionIdRef.current === null) {
              console.log('ℹ️ TTS interrupted by user skip - ignoring error');
              return;
            }
            console.error('❌ Welcome/Question TTS error:', err);
            speakingQuestionIdRef.current = null;
            cancelSpeech();
            setTimeout(() => {
              setPhase('listening');
            }, 1000);
          });
      } else {
        // If muted, mark as handled and skip to listening
        speakingQuestionIdRef.current = currentQuestion.questionId;
        setTimeout(() => {
          speakingQuestionIdRef.current = null;
          setPhase('listening');
        }, 100);
      }
    }
  }, [phase, currentQuestion, progress, isMuted, speak, setPhase, cancelSpeech]);

  // Add new questions to message history
  useEffect(() => {
    if (currentQuestion && !questionsAskedRef.current.has(currentQuestion.questionId)) {
      questionsAskedRef.current.add(currentQuestion.questionId);
      setMessages((prev) => [
        ...prev,
        {
          id: currentQuestion.questionId,
          sender: 'ai',
          text: currentQuestion.questionText,
          timestamp: new Date(),
        },
      ]);
    }
  }, [currentQuestion]);

  // Handle phase transitions
  useEffect(() => {
    if (phase === 'speaking' && currentQuestion) {
      // Prevent duplicate TTS calls for the same question (React dependency re-run issue)
      if (speakingQuestionIdRef.current === currentQuestion.questionId) {
        console.log('⏭️ Skipping duplicate TTS call for question:', currentQuestion.questionId);
        return;
      }

      speakingQuestionIdRef.current = currentQuestion.questionId;
      console.log('🎤 AI speaking question:', currentQuestion.questionText.substring(0, 50));

      // AI speaks the question
      if (!isMuted) {
        speak(currentQuestion.questionText)
          .then(() => {
            console.log('✅ TTS finished, switching to listening');
            speakingQuestionIdRef.current = null;
            setPhase('listening');
          })
          .catch((err) => {
            // Check if ref is already null (user skipped)
            if (speakingQuestionIdRef.current === null) {
              console.log('ℹ️ TTS interrupted by user skip - ignoring error');
              return;
            }
            // Genuine TTS error
            console.error('❌ TTS error:', err);
            speakingQuestionIdRef.current = null;
            // If TTS fails, cancel any ongoing speech and wait before listening
            cancelSpeech();
            setTimeout(() => {
              setPhase('listening');
            }, 1000);
          });
      } else {
        // If muted, skip to listening immediately
        speakingQuestionIdRef.current = null;
        setPhase('listening');
      }
    }

    // Only start listening when we transition INTO the listening phase
    if (phase === 'listening' && prevPhaseRef.current !== 'listening') {
      console.log('👂 Transitioning to listening phase - waiting for audio to clear...');
      // Add a delay to prevent microphone from picking up AI voice from speakers
      setTimeout(() => {
        console.log('🎙️ Audio cleared - starting speech recognition');
        resetTranscript();
        startListening();
      }, 500); // 500ms delay to let speaker audio fully stop
    }

    // Update previous phase ref
    prevPhaseRef.current = phase;

    if (phase === 'submitting' || phase === 'transitioning') {
      // Stop listening when submitting
      stopListening();
    }

    if (phase === 'closing' && !closingHandledRef.current) {
      closingHandledRef.current = true;
      // Speak closing message before completing
      const closingText = 'Thank you! That was the last question. Your interview is now complete.';

      setMessages((prev) => [
        ...prev,
        {
          id: 'closing',
          sender: 'ai',
          text: closingText,
          timestamp: new Date(),
        },
      ]);

      // Speak the closing message, then transition to complete
      if (!isMuted) {
        speak(closingText)
          .then(() => {
            console.log('✅ Closing message finished');
            setPhase('complete');
          })
          .catch((err) => {
            console.error('❌ Failed to speak closing message:', err);
            // Still transition to complete even if speech fails
            setPhase('complete');
          });
      } else {
        // If muted, go directly to complete
        setPhase('complete');
      }
    }

    if (phase === 'complete' && !completeHandledRef.current) {
      completeHandledRef.current = true;
      // Interview completed - end session and redirect
      stopListening();
      cancelSpeech();
      endSession().then(() => {
        onComplete();
      }).catch((err) => {
        console.error('Failed to end session:', err);
        // Still redirect even if end session fails
        onComplete();
      });
    }
  }, [phase, currentQuestion, isMuted, speak, setPhase, resetTranscript, startListening, stopListening, cancelSpeech, onComplete, setMessages, endSession]);

  // Update transcript in session state
  useEffect(() => {
    const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');
    updateTranscript(fullTranscript.trim());
  }, [transcript, interimTranscript, updateTranscript]);

  // Handle errors
  useEffect(() => {
    if (sessionError && onError) {
      onError(sessionError);
    }
  }, [sessionError, onError]);

  const handleSubmit = useCallback(async () => {
    const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');
    const responseText = fullTranscript.trim();

    if (responseText) {
      // Add candidate response to message history
      setMessages((prev) => [
        ...prev,
        {
          id: `response-${Date.now()}`,
          sender: 'candidate',
          text: responseText,
          timestamp: new Date(),
        },
      ]);
    }

    stopListening();
    await submitCurrentResponse();
    // After submission, phase will change to 'closing' if it was the last question
  }, [transcript, interimTranscript, stopListening, submitCurrentResponse]);

  const handleEndInterview = useCallback(async () => {
    stopListening();
    cancelSpeech();
    await endSession();
  }, [stopListening, cancelSpeech, endSession]);

  const handleToggleMute = () => {
    if (isSpeaking) {
      cancelSpeech();
    }
    setIsMuted(!isMuted);
  };

  const handleSkipToListening = useCallback(() => {
    console.log('⏭️ User skipped to listening phase');
    // Clear the ref first to signal this is intentional (not an error)
    speakingQuestionIdRef.current = null;
    cancelSpeech();
    setPhase('listening');
  }, [cancelSpeech, setPhase]);

  // Calculate canSubmit early so it can be used in keyboard handler
  const canSubmit = (transcript + interimTranscript).trim().length > 0;

  // Keyboard handler for Space bar
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle Space if not typing in an input
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();

        if (phase === 'speaking' && isSpeaking) {
          // Skip TTS and go to listening
          handleSkipToListening();
        } else if (phase === 'listening' && canSubmit && !isLoading) {
          // Submit response
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [phase, isSpeaking, canSubmit, isLoading, handleSkipToListening, handleSubmit]);

  // Loading state
  if (phase === 'loading' || phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#005DDC]" />
        <p className="text-gray-600">Preparing your interview...</p>
      </div>
    );
  }

  // Error state
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Something went wrong</h3>
        <p className="text-gray-600 text-center max-w-md">{sessionError}</p>
        <button
          onClick={() => initSession()}
          className="px-6 py-2 bg-[#005DDC] text-white rounded-lg hover:bg-[#004EB7]"
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main Content - 60/40 Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Video (60%) */}
        <div className="w-3/5 p-6">
          <VideoPreview
            stream={stream}
            isRecording={isListening}
          />
        </div>

        {/* Right Panel - Transcript (40%) */}
        <div className="w-2/5 p-6 pl-0">
          <LiveTranscript
            messages={messages}
            currentTranscript={currentTranscript}
            isListening={isListening}
            onEndResponse={handleSubmit}
            canSubmit={canSubmit && phase === 'listening'}
            isSubmitting={phase === 'submitting'}
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <InterviewBottomBar
        jobTitle={jobTitle}
        currentQuestion={progress.current}
        totalQuestions={progress.total}
      />
    </div>
  );
};

export default InterviewRoom;
