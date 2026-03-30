'use client';

import { useState, useCallback, useRef, RefObject } from 'react';

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => Promise<void>;
  cancel: () => void;
  prewarmAudio: (text: string) => void;
}

export function useTextToSpeech(
  audioContextRef?: RefObject<AudioContext | null>,
  destinationRef?: RefObject<MediaStreamAudioDestinationNode | null>,
): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  // Cache pre-fetched blob URLs by text so first TTS plays instantly
  const audioCacheRef = useRef<Map<string, string>>(new Map());

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
    // Use pre-fetched cached blob URL if available (avoids network latency on first play)
    const cached = audioCacheRef.current.get(text);
    let url: string;

    if (cached) {
      // Remove from cache — blob URLs are one-time use (will be revoked on finish)
      audioCacheRef.current.delete(text);
      url = cached;
    } else {
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
      url = URL.createObjectURL(blob);
    }
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
      audio.onerror = (e) => { console.error('[TTS] audio.onerror', e); finish(); };

      setIsSpeaking(true);
      audio.play().catch((e) => { console.error('[TTS] audio.play() failed:', e); finish(); });
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

  // ── Google Translate TTS fallback ──────────────────────────────────────────
  const speakWithGoogleTranslate = useCallback(async (text: string): Promise<void> => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/interviews/tts/fallback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      }
    );
    if (!response.ok) throw new Error(`Fallback TTS ${response.status}`);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audioRef.current = audio;

    const audioCtx = audioContextRef?.current;
    const destination = destinationRef?.current;
    if (audioCtx && destination) {
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(destination);
      source.connect(audioCtx.destination);
    }

    audio.src = url;

    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      const finish = () => { URL.revokeObjectURL(url); setIsSpeaking(false); resolveRef.current = null; resolve(); };
      audio.onended = finish;
      audio.onerror = () => finish();
      setIsSpeaking(true);
      audio.play().catch(() => finish());
    });
  }, [audioContextRef, destinationRef]);

  // ── Pre-fetch TTS audio in the background so first play is instant ──────────
  const prewarmAudio = useCallback((text: string): void => {
    if (audioCacheRef.current.has(text)) return; // already cached
    const token = localStorage.getItem('authToken');
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/interviews/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => { audioCacheRef.current.set(text, URL.createObjectURL(blob)); })
      .catch(() => {}); // silent — speak() will fetch normally if cache miss
  }, []);

  // ── Public speak: Unreal Speech → Google Translate → Web Speech API ─────────
  const speak = useCallback(async (text: string): Promise<void> => {
    try {
      await speakWithBackend(text);
    } catch {
      try {
        await speakWithGoogleTranslate(text);
      } catch {
        await speakWithSpeechSynthesis(text);
      }
    }
  }, [speakWithBackend, speakWithGoogleTranslate, speakWithSpeechSynthesis]);

  return { isSpeaking, isSupported: true, speak, cancel, prewarmAudio };
}
