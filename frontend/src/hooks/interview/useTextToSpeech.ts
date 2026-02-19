'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface TextToSpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
}

interface UseTextToSpeechReturn extends TextToSpeechState {
  speak: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [state, setState] = useState<TextToSpeechState>({
    isSpeaking: false,
    isPaused: false,
    isSupported: false,
    voices: [],
    selectedVoice: null,
    rate: 0.9,  // Slightly slower for natural sound
    pitch: 1.1, // Slightly higher for warmer tone
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const rejectRef = useRef<((reason?: any) => void) | null>(null);

  // Check browser support and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));

        // Score voices to find the most natural-sounding one
        const scoredVoices = englishVoices.map(voice => {
          let score = 0;
          const name = voice.name.toLowerCase();

          // Prefer female voices (often sound more natural)
          const femaleNames = ['samantha', 'karen', 'victoria', 'susan', 'zira',
                               'hazel', 'fiona', 'moira', 'tessa', 'ava', 'allison'];
          if (femaleNames.some(fn => name.includes(fn))) score += 10;
          if (name.includes('female')) score += 8;

          // Prefer neural/natural/premium voices
          if (name.includes('neural') || name.includes('natural')) score += 15;
          if (name.includes('premium') || name.includes('enhanced')) score += 12;

          // Prefer US English
          if (voice.lang === 'en-US') score += 3;

          // Avoid robotic-sounding voices
          if (name.includes('david') || name.includes('mark')) score -= 2;

          return { voice, score };
        });

        scoredVoices.sort((a, b) => b.score - a.score);
        const bestVoice = scoredVoices[0]?.voice || englishVoices[0] || availableVoices[0];

        setState(prev => ({
          ...prev,
          voices: availableVoices,
          selectedVoice: prev.selectedVoice || bestVoice,
        }));
      }
    };

    // Load voices immediately
    loadVoices();

    // Some browsers load voices asynchronously
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Speak text
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!state.isSupported || !window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      resolveRef.current = resolve;
      rejectRef.current = reject;

      // Set voice settings
      if (state.selectedVoice) {
        utterance.voice = state.selectedVoice;
      }
      utterance.rate = state.rate;
      utterance.pitch = state.pitch;

      // Event handlers
      utterance.onstart = () => {
        setState(prev => ({ ...prev, isSpeaking: true, isPaused: false }));
      };

      utterance.onend = () => {
        setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
        // Only resolve if we haven't already rejected
        if (resolveRef.current) {
          resolveRef.current();
          resolveRef.current = null;
          rejectRef.current = null;
        }
      };

      utterance.onerror = (event) => {
        setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
        // Reject the promise on error (triggers .catch())
        if (rejectRef.current) {
          // Don't log 'canceled' or 'interrupted' - these are usually user-initiated
          if (event.error !== 'canceled' && event.error !== 'interrupted') {
            console.error('Speech synthesis error:', event.error);
          }
          rejectRef.current(new Error(event.error));
          rejectRef.current = null;
          resolveRef.current = null;
        }
      };

      utterance.onpause = () => {
        setState(prev => ({ ...prev, isPaused: true }));
      };

      utterance.onresume = () => {
        setState(prev => ({ ...prev, isPaused: false }));
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);
    });
  }, [state.isSupported, state.selectedVoice, state.rate, state.pitch]);

  // Pause speech
  const pause = useCallback(() => {
    if (state.isSupported && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }, [state.isSupported]);

  // Resume speech
  const resume = useCallback(() => {
    if (state.isSupported && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }, [state.isSupported]);

  // Cancel speech
  const cancel = useCallback(() => {
    if (state.isSupported && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
    }
  }, [state.isSupported]);

  // Set voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setState(prev => ({ ...prev, selectedVoice: voice }));
  }, []);

  // Set rate (0.1 to 10)
  const setRate = useCallback((rate: number) => {
    setState(prev => ({ ...prev, rate: Math.max(0.1, Math.min(10, rate)) }));
  }, []);

  // Set pitch (0 to 2)
  const setPitch = useCallback((pitch: number) => {
    setState(prev => ({ ...prev, pitch: Math.max(0, Math.min(2, pitch)) }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isSupported && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [state.isSupported]);

  return {
    ...state,
    speak,
    pause,
    resume,
    cancel,
    setVoice,
    setRate,
    setPitch,
  };
}
