'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Browser compatibility types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface SpeechToTextState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  confidence: number;
}

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseSpeechToTextReturn extends SpeechToTextState {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setLanguage: (lang: string) => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
  } = options;

  const [state, setState] = useState<SpeechToTextState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    error: null,
    confidence: 0,
  });

  const [lang, setLang] = useState(language);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setState(prev => ({ ...prev, isSupported: true }));
    } else {
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'Speech recognition is not supported in this browser. Please use Chrome or Edge.',
      }));
    }
  }, []);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎙️ Speech recognition started');
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          console.log('✅ Final transcript:', transcript);
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
          }
        } else {
          interimTranscript += transcript;
          console.log('⏳ Interim transcript:', transcript);
        }
      }

      setState(prev => ({
        ...prev,
        transcript: prev.transcript + finalTranscript,
        interimTranscript,
        confidence: maxConfidence || prev.confidence,
      }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log('🚨 Speech recognition error:', event.error);
      let errorMessage = 'Speech recognition error';

      switch (event.error) {
        case 'no-speech':
          // Don't treat as fatal error - just log and auto-restart
          console.log('⚠️ No speech detected, will auto-restart');
          return;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please ensure a microphone is connected.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access was denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your internet connection.';
          break;
        case 'aborted':
          // User aborted, not an error
          console.log('ℹ️ Speech recognition aborted');
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      console.error('❌ Speech recognition fatal error:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      console.log('🛑 Speech recognition ended. isListeningRef:', isListeningRef.current, 'continuous:', continuous);
      // Auto-restart if still supposed to be listening (continuous mode)
      if (isListeningRef.current && continuous) {
        console.log('🔄 Auto-restarting speech recognition');
        try {
          recognition.start();
        } catch (err) {
          console.error('⚠️ Failed to restart:', err);
          // Ignore errors on restart
        }
      } else {
        console.log('ℹ️ Speech recognition stopped (not restarting)');
        setState(prev => ({ ...prev, isListening: false }));
      }
    };

    return recognition;
  }, [continuous, interimResults, lang]);

  // Start listening
  const startListening = useCallback(() => {
    console.log('🔵 startListening called. Current state:', {
      isListening: isListeningRef.current,
      hasRecognition: !!recognitionRef.current
    });

    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Speech recognition is not supported in this browser.',
      }));
      return;
    }

    // If already listening, don't restart
    if (isListeningRef.current && recognitionRef.current) {
      console.log('⚠️ Already listening, skipping restart');
      return;
    }

    // Stop existing recognition
    if (recognitionRef.current) {
      console.log('🛑 Aborting existing recognition');
      recognitionRef.current.abort();
    }

    // Create new recognition instance
    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    isListeningRef.current = true;

    try {
      console.log('▶️ Starting speech recognition');
      recognition.start();
    } catch (err) {
      console.error('❌ Failed to start speech recognition:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to start speech recognition.',
        isListening: false,
      }));
      isListeningRef.current = false;
    }
  }, [state.isSupported, initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isListening: false,
      // Clear interim transcript on stop
      interimTranscript: '',
    }));
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
    }));
  }, []);

  // Set language
  const setLanguage = useCallback((newLang: string) => {
    setLang(newLang);
    // If currently listening, restart with new language
    if (isListeningRef.current) {
      stopListening();
      setTimeout(() => startListening(), 100);
    }
  }, [stopListening, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage,
  };
}
