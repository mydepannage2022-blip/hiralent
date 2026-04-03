'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reads real-time microphone amplitude from a MediaStream.
 *
 * Human voice energy is concentrated in 85–3000 Hz.
 * With fftSize=1024 at 48 kHz each bin ≈ 47 Hz, so voice spans bins ~2–64.
 * We split that voice range into `barCount` bands so each bar reacts to a
 * different part of the voice spectrum, giving natural independent movement.
 */
export function useAudioLevel(
  stream: MediaStream | null,
  active: boolean,
  barCount = 4,
): number[] {
  const [levels, setLevels] = useState<number[]>(Array(barCount).fill(0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      setLevels(Array(barCount).fill(0));
      return;
    }

    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      return;
    }

    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;           // 512 bins, ~47 Hz/bin at 48 kHz
    analyser.smoothingTimeConstant = 0.4; // responsive (lower = faster)

    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount); // 512 entries

    // Focus on voice frequency range only (bins 2–64 ≈ 94–3008 Hz)
    const voiceStart = 2;
    const voiceEnd = 64;
    const bandSize = Math.floor((voiceEnd - voiceStart) / barCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      const newLevels = Array.from({ length: barCount }, (_, band) => {
        const start = voiceStart + band * bandSize;
        const end = start + bandSize;
        let sum = 0;
        for (let i = start; i < end; i++) sum += dataArray[i];
        const avg = sum / (bandSize * 255); // 0–1
        return Math.min(1, avg * 5);        // amplify 5× for visibility
      });

      setLevels(newLevels);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      context.close();
    };
  }, [stream, active, barCount]);

  return levels;
}
