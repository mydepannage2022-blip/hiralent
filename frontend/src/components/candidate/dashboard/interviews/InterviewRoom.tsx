'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, VideoOff } from 'lucide-react';
import { useMediaDevices, useTextToSpeech, useSpeechToText, useInterviewSession, useCameraBlockDetection } from '@/src/hooks/interview';
import { useVideoRecorder } from '@/src/hooks/interview/useVideoRecorder';
import { uploadInterviewVideo } from '@/src/lib/interview/interview.api';
import { useProfile } from '@/src/context/ProfileContext';
import { useAuth } from '@/src/context/AuthContext';
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
  // Get candidate profile data
  const { profileData } = useProfile();
  const { user } = useAuth();
  const candidateName = user?.full_name || 'You';
  const candidatePhoto = profileData?.profile_picture_url || null;

  const [isMuted, setIsMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const prevPhaseRef = useRef<string>('idle');
  const speakingQuestionIdRef = useRef<string | null>(null);
  const questionsAskedRef = useRef<Set<string>>(new Set());
  const welcomeShownRef = useRef(false);
  const closingHandledRef = useRef(false);
  const completeHandledRef = useRef(false);
  const recordingStartedRef = useRef(false);

  // Custom hooks
  const {
    getStream,
    releaseStream,
    isCameraEnabled,
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

  // Detect physically blocked camera (covered/closed)
  const { isCameraBlocked } = useCameraBlockDetection({
    stream,
    enabled: phase !== 'idle' && phase !== 'loading' && phase !== 'complete' && phase !== 'error',
  });

  // Combined camera status: disabled via browser OR physically blocked
  const isCameraUnavailable = !isCameraEnabled || isCameraBlocked;

  // Video recording
  const {
    isRecording,
    isSupported: isRecordingSupported,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useVideoRecorder(stream);

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

  // Start video recording when stream becomes available (if interview already started)
  useEffect(() => {
    if (
      stream &&
      isRecordingSupported &&
      !recordingStartedRef.current &&
      phase !== 'idle' &&
      phase !== 'loading' &&
      phase !== 'complete' &&
      phase !== 'error'
    ) {
      console.log('🎬 Stream ready - starting video recording');
      recordingStartedRef.current = true;
      startRecording();
    }
  }, [stream, isRecordingSupported, phase, startRecording]);

  // Add welcome message when interview starts (only on first question)
  useEffect(() => {
    if (phase === 'speaking' && !welcomeShownRef.current && currentQuestion && progress.current === 1) {
      welcomeShownRef.current = true;
      const welcomeText = 'Hello! This is an AI interview. I will ask you a series of questions to assess your skills and experience. Please answer each question clearly and take your time. Let\'s begin.';

      // Start video recording when interview begins
      if (!recordingStartedRef.current && isRecordingSupported && stream) {
        recordingStartedRef.current = true;
        console.log('🎬 Starting video recording for interview');
        startRecording();
      }

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
  }, [phase, currentQuestion, progress, isMuted, speak, setPhase, cancelSpeech, isRecordingSupported, stream, startRecording]);

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
      console.log('⏱️ [TIMING] Closing phase started:', new Date().toISOString());

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
        console.log('⏱️ [TIMING] TTS starting:', new Date().toISOString());
        speak(closingText)
          .then(() => {
            console.log('⏱️ [TIMING] TTS finished:', new Date().toISOString());
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
      console.log('⏱️ [TIMING] Complete phase - calling onComplete():', new Date().toISOString());

      // Interview completed - stop recording, upload video, end session
      stopListening();
      cancelSpeech();

      // Redirect immediately for better UX - don't wait for upload/processing
      onComplete();
      console.log('⏱️ [TIMING] onComplete() called:', new Date().toISOString());

      // Run video upload and endSession in background (fire and forget)
      const handleBackgroundProcessing = async (): Promise<void> => {
        console.log('⏱️ [TIMING] Background processing started:', new Date().toISOString());
        try {
          // Stop recording and upload video
          if (isRecording || recordingStartedRef.current) {
            try {
              console.log('🛑 Stopping video recording...');
              const videoBlob = await stopRecording();

              if (videoBlob && videoBlob.size > 0) {
                console.log(`📤 Uploading video in background (${(videoBlob.size / 1024 / 1024).toFixed(2)} MB)...`);
                await uploadInterviewVideo(interviewId, videoBlob, (progress) => {
                  console.log(`📤 Upload progress: ${progress}%`);
                });
                console.log('✅ Video uploaded successfully');
              }
            } catch (err) {
              console.error('❌ Failed to upload video:', err);
            }
          }

          // End session (triggers AI evaluation in background)
          await endSession();
          console.log('✅ Interview session ended successfully');
        } catch (err) {
          console.error('❌ Background processing error:', err);
        }
      };

      // Fire and forget - don't block the redirect
      handleBackgroundProcessing();
    }
  }, [phase, currentQuestion, isMuted, speak, setPhase, resetTranscript, startListening, stopListening, cancelSpeech, onComplete, setMessages, endSession, isRecording, stopRecording, interviewId]);

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

  // Log recording errors
  useEffect(() => {
    if (recordingError) {
      console.error('❌ Video recording error:', recordingError);
    }
  }, [recordingError]);

  // Track if we were speaking when camera became unavailable
  const wasInterruptedWhileSpeakingRef = useRef(false);

  // Pause/resume interview based on camera status (disabled OR physically blocked)
  useEffect(() => {
    if (isCameraUnavailable) {
      if (phase === 'listening') {
        console.log('📹 Camera unavailable - pausing interview');
        stopListening();
      }
      if (phase === 'speaking') {
        console.log('📹 Camera unavailable - stopping speech');
        wasInterruptedWhileSpeakingRef.current = true;
        // Clear ref BEFORE canceling to signal this is intentional (not an error)
        speakingQuestionIdRef.current = null;
        cancelSpeech();
      }
    } else {
      // Camera is back on
      if (phase === 'listening' && !isListening) {
        console.log('📹 Camera available - resuming listening');
        startListening();
      }
      // If we were interrupted while speaking, transition to listening
      // (the question is already visible in the chat, candidate can read it)
      if (phase === 'speaking' && wasInterruptedWhileSpeakingRef.current) {
        console.log('📹 Camera available - was interrupted while speaking, moving to listening');
        wasInterruptedWhileSpeakingRef.current = false;
        setPhase('listening');
      }
    }
  }, [isCameraUnavailable, phase, isListening, stopListening, cancelSpeech, startListening, setPhase]);

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
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Camera Unavailable Warning Overlay (disabled or physically blocked) */}
      {isCameraUnavailable && phase !== 'complete' && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <VideoOff className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isCameraBlocked ? 'Camera Blocked' : 'Camera Disabled'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isCameraBlocked
                ? 'Your camera appears to be covered or blocked. Please uncover your camera to continue the interview.'
                : 'Your camera has been turned off. Please enable your camera to continue the interview.'}
              {' '}The interview is paused until your camera is back on.
            </p>
            <div className="text-sm text-gray-500">
              {isCameraBlocked
                ? 'Remove any cover from your camera lens or open your laptop lid.'
                : "Check your browser's camera permissions or reconnect your camera device."}
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content - 60/40 Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Video (60%) */}
        <div className="w-3/5 p-6">
          <VideoPreview
            stream={stream}
            isRecording={isRecording}
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
            userName={candidateName}
            candidatePhoto={candidatePhoto}
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
