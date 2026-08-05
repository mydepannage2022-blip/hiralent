'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_V1_BASE } from '@/src/lib/config/api';
import { AlertCircle, Loader2, VideoOff, AlertTriangle } from 'lucide-react';
import { useMediaDevices, useTextToSpeech, useSpeechToText, useInterviewSession, useCameraBlockDetection, useFaceDetection, usePhoneDetection } from '@/src/hooks/interview';
import { useVideoRecorder } from '@/src/hooks/interview/useVideoRecorder';
import { uploadInterviewVideo, logViolation } from '@/src/lib/interview/interview.api';
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
  const { user } = useAuth();
  const candidateName = user?.full_name || 'You';

  const [isMuted, setIsMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [windowBlurWarning, setWindowBlurWarning] = useState(false);

  // Web Audio: mix mic + AI TTS into a single stream for MediaRecorder
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const roomRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      roomRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const prevPhaseRef = useRef<string>('idle');
  const speakingQuestionIdRef = useRef<string | null>(null);
  const questionsAskedRef = useRef<Set<string>>(new Set());
  const welcomeShownRef = useRef(false);
  // Hold q1 from appearing in chat until welcome message TTS finishes
  const holdFirstQuestionRef = useRef(true);
  const closingHandledRef = useRef(false);
  const completeHandledRef = useRef(false);
  const recordingStartedRef = useRef(false);
  const recordingStartTimeRef = useRef<Date | null>(null);
  const phaseRef = useRef<string>('idle');
  // Dedup ref: prevents React Strict Mode double-invocation from logging the same violation twice
  const lastLoggedViolationRef = useRef<string | null>(null);

  // Streaming TTS state
  const streamBufferRef = useRef('');
  const streamQueueRef = useRef<string[]>([]);
  const isStreamSpeakingRef = useRef(false);
  const streamSentenceCountRef = useRef(0);
  const streamKeyRef = useRef('');

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
    prewarmAudio,
  } = useTextToSpeech(audioContextRef, destinationRef);

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

  // Face detection proctoring
  const { lastViolation, faceCount, isNoFace, isMultipleFaces, isLookingAway } = useFaceDetection({
    stream,
    enabled: phase !== 'idle' && phase !== 'loading' && phase !== 'complete' && phase !== 'error',
  });

  // Log face violations to backend — dedup ref prevents double-logging from React Strict Mode
  useEffect(() => {
    if (!lastViolation) {
      lastLoggedViolationRef.current = null; // reset when face normalizes
      return;
    }
    if (lastLoggedViolationRef.current === lastViolation) return; // already logged
    lastLoggedViolationRef.current = lastViolation;
    logViolation(interviewId, lastViolation, faceCount).catch(() => {});
  }, [lastViolation, interviewId]); // faceCount intentionally excluded — only log when violation type changes

  // Phone detection proctoring
  const { isPhoneDetected, lastViolation: phoneViolation } = usePhoneDetection({
    stream,
    enabled: phase !== 'idle' && phase !== 'loading' && phase !== 'complete' && phase !== 'error',
  });

  // Log phone violations to backend
  const lastLoggedPhoneRef = useRef<string | null>(null);
  useEffect(() => {
    if (!phoneViolation) {
      lastLoggedPhoneRef.current = null;
      return;
    }
    if (lastLoggedPhoneRef.current === phoneViolation) return;
    lastLoggedPhoneRef.current = phoneViolation;
    logViolation(interviewId, 'PHONE_DETECTED', 0).catch(() => {});
  }, [phoneViolation, interviewId]);

  // Video recording — use mixed stream (mic + TTS) when available
  const {
    isRecording,
    isSupported: isRecordingSupported,
    startRecording,
    stopRecording,
    getCurrentBlob,
  } = useVideoRecorder(recordingStream ?? stream);

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

  // Set up Web Audio mixing: combine mic audio + TTS audio into one stream for MediaRecorder
  useEffect(() => {
    if (!stream) return;

    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();

    // Tap mic audio into the mix
    const micSource = audioCtx.createMediaStreamSource(stream);
    micSource.connect(destination);

    audioContextRef.current = audioCtx;
    destinationRef.current = destination;

    // Resume immediately — the user just clicked "Start Interview" so we have a user gesture context
    audioCtx.resume().catch(() => {});

    // Build combined stream: video track from camera + mixed audio track
    const combined = new MediaStream([
      ...stream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);
    setRecordingStream(combined);

    return () => {
      audioCtx.close();
      audioContextRef.current = null;
      destinationRef.current = null;
      setRecordingStream(null);
    };
  }, [stream]);

  // Initialize interview session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Pre-warm the welcome TTS audio while startInterview() is still loading
  // so the audio is ready to play the moment phase transitions to 'speaking'
  useEffect(() => {
    if (phase === 'loading') {
      const welcomeText = `Hello ${candidateName}! Welcome to your AI interview. I will ask you a series of questions to assess your skills and experience. Please answer each question clearly and take your time. Let's begin.`;
      prewarmAudio(welcomeText);
    }
  }, [phase, candidateName, prewarmAudio]);

  // Keep phaseRef in sync so event handlers always read current phase
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Start recording when stream is ready and interview is active
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
      recordingStartedRef.current = true;
      recordingStartTimeRef.current = new Date();
      startRecording();
    }
  }, [stream, isRecordingSupported, phase, startRecording]);

  // End interview if candidate navigates away (sidebar click = client-side unmount)
  // visibilitychange does NOT fire for same-tab navigation — only unmount catches it.
  // We get the blob synchronously from accumulated chunks (no need to stop recorder first).
  useEffect(() => {
    return () => {
      const currentPhase = phaseRef.current;
      if (currentPhase === 'complete' || currentPhase === 'idle' || currentPhase === 'error') return;
      const token = localStorage.getItem('authToken');
      const baseUrl = API_V1_BASE;

      // Upload accumulated video chunks (client-side nav keeps the page alive, no keepalive needed)
      const blob = getCurrentBlob();
      if (blob && blob.size > 0) {
        const formData = new FormData();
        formData.append('video', blob, 'interview.webm');
        fetch(`${baseUrl}/interviews/${interviewId}/upload-video`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }).catch(() => {});
      }

      // End the interview (keepalive in case of hard navigation)
      fetch(`${baseUrl}/interviews/${interviewId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        keepalive: true,
      }).catch(() => {});
    };
  }, [interviewId, getCurrentBlob]);

  // Log window blur (candidate switches to another app without switching tabs)
  useEffect(() => {
    const lastBlurTimeRef = { current: 0 };
    const COOLDOWN_MS = 5000; // prevent spam if focus flickers

    const handleWindowBlur = () => {
      // Delay so visibilitychange (tab switch) has time to fire first and set document.hidden
      setTimeout(() => {
        // If the page is now hidden, visibilitychange already handled it as TAB_SWITCH
        if (document.hidden) return;
        const currentPhase = phaseRef.current;
        if (currentPhase === 'complete' || currentPhase === 'idle' || currentPhase === 'error') return;

        const now = Date.now();
        if (now - lastBlurTimeRef.current < COOLDOWN_MS) return;
        lastBlurTimeRef.current = now;

        logViolation(interviewId, 'WINDOW_BLUR', 0).catch(() => {});
        setWindowBlurWarning(true);
        setTimeout(() => setWindowBlurWarning(false), 4000);
      }, 100);
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [interviewId]);

  // Log tab switch violation and show warning banner (interview continues)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      const currentPhase = phaseRef.current;
      if (currentPhase === 'complete' || currentPhase === 'idle' || currentPhase === 'error') return;

      logViolation(interviewId, 'TAB_SWITCH', 0).catch((e) => console.error('[TAB_SWITCH] logViolation failed:', e));

      setTabSwitchWarning(true);
      setTimeout(() => setTabSwitchWarning(false), 4000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interviewId]);

  // Split text into sentences for multi-bubble rendering
  const splitSentences = (text: string): string[] =>
    text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

  // Add sentence bubbles to messages immediately (used in muted path)
  const addSentenceBubbles = useCallback((text: string, questionId: string) => {
    const sentences = splitSentences(text);
    sentences.forEach((sentence, i) => {
      const id = `${questionId}_s${i}`;
      setMessages((prev) => {
        if (prev.some((m) => m.id === id)) return prev; // deduplicate
        return [...prev, { id, sender: 'ai' as const, text: sentence, timestamp: new Date() }];
      });
    });
  }, []);

  // Speak sentence by sentence, adding each bubble just before speaking it
  const speakSentences = useCallback(async (text: string, questionId: string): Promise<void> => {
    const sentences = splitSentences(text);
    for (let i = 0; i < sentences.length; i++) {
      const id = `${questionId}_s${i}`;
      setMessages((prev) => {
        if (prev.some((m) => m.id === id)) return prev; // deduplicate
        return [...prev, { id, sender: 'ai' as const, text: sentences[i], timestamp: new Date() }];
      });
      await speak(sentences[i]);
    }
  }, [speak]);

  // Helper to release q1 hold (message bubbles added by speakSentences / addSentenceBubbles)
  const revealFirstQuestion = useCallback((question: { questionId: string }) => {
    holdFirstQuestionRef.current = false;
    questionsAskedRef.current.add(question.questionId);
  }, []);

  // Add welcome message when interview starts (only on first question)
  useEffect(() => {
    if (phase === 'speaking' && !welcomeShownRef.current && currentQuestion && progress.current === 1) {
      welcomeShownRef.current = true;
      const welcomeText = `Hello ${candidateName}! Welcome to your AI interview. I will ask you a series of questions to assess your skills and experience. Please answer each question clearly and take your time. Let's begin.`;

      // Start recording when interview begins
      if (!recordingStartedRef.current && isRecordingSupported && stream) {
        recordingStartedRef.current = true;
        recordingStartTimeRef.current = new Date();
        startRecording();
      }

      // Speak welcome message + first question together
      if (!isMuted) {
        // Mark this question as being handled to prevent duplicate TTS in phase transition
        speakingQuestionIdRef.current = currentQuestion.questionId;

        speakSentences(welcomeText, 'welcome')
          .then(() => {
            console.log('✅ Welcome message finished, now revealing and speaking first question');
            revealFirstQuestion(currentQuestion);
            return speakSentences(currentQuestion.questionText, currentQuestion.questionId);
          })
          .then(() => {
            console.log('✅ First question finished, switching to listening');
            speakingQuestionIdRef.current = null;
            setPhase('listening');
          })
          .catch((err) => {
            if (speakingQuestionIdRef.current === null) {
              console.log('ℹ️ TTS interrupted by user skip - ignoring error');
              return;
            }
            console.error('❌ Welcome/Question TTS error:', err);
            speakingQuestionIdRef.current = null;
            cancelSpeech();
            // Still reveal q1 on error so candidate can read it
            revealFirstQuestion(currentQuestion);
            addSentenceBubbles(currentQuestion.questionText, currentQuestion.questionId);
            setTimeout(() => setPhase('listening'), 1000);
          });
      } else {
        // If muted, add welcome + q1 sentence bubbles immediately
        speakingQuestionIdRef.current = currentQuestion.questionId;
        addSentenceBubbles(welcomeText, 'welcome');
        revealFirstQuestion(currentQuestion);
        addSentenceBubbles(currentQuestion.questionText, currentQuestion.questionId);
        setTimeout(() => {
          speakingQuestionIdRef.current = null;
          setPhase('listening');
        }, 100);
      }
    }
  }, [phase, currentQuestion, progress, isMuted, speak, speakSentences, addSentenceBubbles, setPhase, cancelSpeech, candidateName, revealFirstQuestion, isRecordingSupported, stream, startRecording]);

  // Track new questions — actual bubbles are added by speakSentences / addSentenceBubbles
  useEffect(() => {
    if (currentQuestion && !questionsAskedRef.current.has(currentQuestion.questionId)) {
      if (holdFirstQuestionRef.current && progress.current === 1) return;
      questionsAskedRef.current.add(currentQuestion.questionId);
    }
  }, [currentQuestion, progress]);

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

      // AI speaks the question sentence by sentence
      if (!isMuted) {
        speakSentences(currentQuestion.questionText, currentQuestion.questionId)
          .then(() => {
            console.log('✅ TTS finished, switching to listening');
            speakingQuestionIdRef.current = null;
            setPhase('listening');
          })
          .catch((err) => {
            if (speakingQuestionIdRef.current === null) {
              console.log('ℹ️ TTS interrupted by user skip - ignoring error');
              return;
            }
            console.error('❌ TTS error:', err);
            speakingQuestionIdRef.current = null;
            cancelSpeech();
            setTimeout(() => setPhase('listening'), 1000);
          });
      } else {
        // If muted, add all sentence bubbles immediately and skip to listening
        addSentenceBubbles(currentQuestion.questionText, currentQuestion.questionId);
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

      // Stop recording, upload video, end session — fire and forget
      const handleBackgroundProcessing = async (): Promise<void> => {
        try {
          if (recordingStartedRef.current) {
            const blob = await stopRecording();
            recordingStartedRef.current = false;
            recordingStartTimeRef.current = null;
            if (blob && blob.size > 0) {
              await uploadInterviewVideo(interviewId, blob);
              console.log('✅ Video uploaded successfully');
            }
          }
          await endSession();
          console.log('✅ Interview session ended successfully');
        } catch (err) {
          console.error('❌ Background processing error:', err);
        }
      };

      handleBackgroundProcessing();
    }
  }, [phase, currentQuestion, isMuted, speak, setPhase, resetTranscript, startListening, stopListening, cancelSpeech, onComplete, setMessages, endSession, stopRecording, interviewId]);

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

  // Drain stream speaking queue — speaks sentences in order, one at a time
  const drainStreamQueue = useCallback(async (): Promise<void> => {
    if (isStreamSpeakingRef.current) return;
    isStreamSpeakingRef.current = true;
    while (streamQueueRef.current.length > 0) {
      const sentence = streamQueueRef.current.shift()!;
      const id = `${streamKeyRef.current}_s${streamSentenceCountRef.current++}`;
      setMessages(prev => {
        if (prev.some(m => m.id === id)) return prev;
        return [...prev, { id, sender: 'ai' as const, text: sentence, timestamp: new Date() }];
      });
      if (!isMuted) await speak(sentence);
    }
    isStreamSpeakingRef.current = false;
  }, [speak, isMuted]);

  // Receive question text chunks from SSE stream — buffer and speak complete sentences
  const handleStreamChunk = useCallback((chunk: string) => {
    streamBufferRef.current += chunk;
    const parts = streamBufferRef.current.split(/(?<=[.!?])\s+/);
    if (parts.length > 1) {
      const sentences = parts.slice(0, -1).filter(s => s.trim());
      streamBufferRef.current = parts[parts.length - 1];
      streamQueueRef.current.push(...sentences);
      drainStreamQueue();
    }
  }, [drainStreamQueue]);

  const handleSubmit = useCallback(async () => {
    const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');
    const responseText = fullTranscript.trim();

    if (responseText) {
      setMessages((prev) => [
        ...prev,
        { id: `response-${Date.now()}`, sender: 'candidate', text: responseText, timestamp: new Date() },
      ]);
    }

    // Reset streaming state
    streamBufferRef.current = '';
    streamQueueRef.current = [];
    isStreamSpeakingRef.current = false;
    streamSentenceCountRef.current = 0;
    streamKeyRef.current = `stream_${Date.now()}`;

    let wasStreamed = false;
    const chunkHandler = (chunk: string) => {
      wasStreamed = true;
      handleStreamChunk(chunk);
    };

    stopListening();
    await submitCurrentResponse(chunkHandler);

    if (wasStreamed) {
      // Flush any remaining buffer (last sentence without punctuation)
      const remaining = streamBufferRef.current.trim();
      if (remaining) {
        streamQueueRef.current.push(remaining);
        streamBufferRef.current = '';
        drainStreamQueue();
      }
      // Wait for all queued sentences to finish speaking
      while (isStreamSpeakingRef.current || streamQueueRef.current.length > 0) {
        await new Promise(r => setTimeout(r, 50));
      }
      setPhase('listening');
    }
  }, [transcript, interimTranscript, stopListening, submitCurrentResponse, handleStreamChunk, drainStreamQueue, setPhase]);

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
      <div className="flex flex-col items-center justify-center min-h-125 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#005DDC]" />
        <p className="text-gray-600">Preparing your interview...</p>
      </div>
    );
  }

  // Error state
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-125 gap-4">
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
    <div ref={roomRef} className="flex flex-col h-screen bg-[#111827] relative">

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

      {/* Main Content - 60/40 Split (75/25 in fullscreen) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Video */}
        <div className={`${!showTranscript ? 'w-full' : isFullscreen ? 'w-3/4' : 'w-3/5'} p-6 relative transition-all duration-300`}>

          {/* Violation Badges — stacked, centered in the video frame */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
            <AnimatePresence>
              {(isNoFace || isMultipleFaces) && phase !== 'complete' && (
                <motion.div
                  key="face"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 bg-amber-500/90 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {isMultipleFaces ? 'Multiple people detected' : 'Please stay in frame'}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isLookingAway && phase !== 'complete' && (
                <motion.div
                  key="looking-away"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 bg-amber-500/90 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Please look at the camera
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isPhoneDetected && phase !== 'complete' && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 bg-red-500/90 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Phone detected
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {tabSwitchWarning && (
                <motion.div
                  key="tab-switch"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 bg-orange-500/95 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-xl backdrop-blur-sm whitespace-nowrap"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Tab switch detected — this has been recorded
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {windowBlurWarning && (
                <motion.div
                  key="window-blur"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 bg-orange-500/95 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-xl backdrop-blur-sm whitespace-nowrap"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Window switch detected — this has been recorded
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <VideoPreview
            stream={stream}
            isRecording={isRecording}
            candidateName={candidateName}
            isSpeaking={isSpeaking}
            isListening={isListening}
          />
        </div>

        {/* Right Panel - Transcript */}
        {showTranscript && (
          <div className={`${isFullscreen ? 'w-1/4' : 'w-2/5'} p-6 pl-0 transition-all duration-300`}>
            <LiveTranscript
              messages={messages}
              currentTranscript={currentTranscript}
              isListening={isListening}
              onEndResponse={handleSubmit}
              canSubmit={canSubmit && phase === 'listening'}
              isSubmitting={phase === 'submitting'}
              userName={candidateName}
            />
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <InterviewBottomBar
        jobTitle={jobTitle}
        showTranscript={showTranscript}
        onToggleTranscript={() => setShowTranscript((v) => !v)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
};

export default InterviewRoom;
