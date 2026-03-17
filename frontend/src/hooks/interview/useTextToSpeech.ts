'use client';

import { useState, useCallback, useRef, RefObject } from 'react';

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => Promise<void>;
  cancel: () => void;
}

export function useTextToSpeech(
  audioContextRef?: RefObject<AudioContext | null>,
  destinationRef?: RefObject<MediaStreamAudioDestinationNode | null>,
): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
    setIsSpeaking(false);
    // Also cancel any Web Speech API fallback that may be running
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ── Backend TTS via Google Translate proxy ──────────────────────────────────
  const speakWithBackend = useCallback(async (text: string): Promise<void> => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/interviews/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      }
    );
    if (!response.ok) throw new Error(`TTS ${response.status}`);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audioRef.current = audio;

    // Route through AudioContext so the AI voice is captured in the recording
    const audioCtx = audioContextRef?.current;
    const destination = destinationRef?.current;
    if (audioCtx && destination) {
      // Resume context if suspended (browser autoplay policy)
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(destination);          // → MediaRecorder stream
      source.connect(audioCtx.destination); // → speakers
    }

    audio.src = url;

    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;

      const finish = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        resolveRef.current = null;
        resolve();
      };

      audio.onended = finish;
      audio.onerror = finish; // resolve silently on error

      setIsSpeaking(true);
      audio.play().catch(finish);
    });
  }, [audioContextRef, destinationRef]);

  // ── Web Speech API fallback ─────────────────────────────────────────────────
  const speakWithSpeechSynthesis = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      // Pick best available English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /libby/i.test(v.name)) ||
        voices.find((v) => v.lang === 'en-GB') ||
        voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
      utterance.rate = 0.88;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        if (e.error === 'interrupted' || e.error === 'canceled') resolve();
        else reject(new Error(e.error));
      };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // ── Public speak — tries backend first, falls back to SpeechSynthesis ───────
  const speak = useCallback(async (text: string): Promise<void> => {
    try {
      await speakWithBackend(text);
    } catch {
      await speakWithSpeechSynthesis(text);
    }
  }, [speakWithBackend, speakWithSpeechSynthesis]);

  return { isSpeaking, isSupported: true, speak, cancel };
}
