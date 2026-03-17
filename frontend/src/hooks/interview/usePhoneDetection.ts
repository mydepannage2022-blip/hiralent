'use client';

import { useState, useEffect, useRef } from 'react';

interface UsePhoneDetectionOptions {
  stream: MediaStream | null;
  enabled?: boolean;
  checkInterval?: number;       // ms between checks (default 1000)
  consecutiveChecks?: number;   // detections required before flagging (default 2)
  confidenceThreshold?: number; // min COCO-SSD score for 'cell phone' (default 0.2)
}

interface UsePhoneDetectionReturn {
  isPhoneDetected: boolean;
  isSupported: boolean;
  lastViolation: 'PHONE_DETECTED' | null;
}

export function usePhoneDetection({
  stream,
  enabled = true,
  checkInterval = 1000,
  consecutiveChecks = 1,
  confidenceThreshold = 0.2,
}: UsePhoneDetectionOptions): UsePhoneDetectionReturn {
  const [isPhoneDetected, setIsPhoneDetected] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastViolation, setLastViolation] = useState<'PHONE_DETECTED' | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWorkerReadyRef = useRef(false);
  const isDetectingRef = useRef(false);
  const badFrameCountRef = useRef(0);
  const lastViolationTypeRef = useRef<'PHONE_DETECTED' | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!stream || !enabled) return;

    cancelledRef.current = false;

    // Spin up the worker — all TF.js CPU inference runs there, main thread stays smooth
    const worker = new Worker(
      new URL('../../workers/phoneDetection.worker.ts', import.meta.url),
    );
    workerRef.current = worker;

    // Off-screen video for frame capture
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    videoRef.current = video;

    // Small canvas — 320×240 is enough for COCO-SSD; reduces copy cost
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    canvasRef.current = canvas;

    function scheduleNext() {
      if (cancelledRef.current) return;
      timerRef.current = setTimeout(sendFrame, checkInterval);
    }

    function sendFrame() {
      if (cancelledRef.current || !isWorkerReadyRef.current || isDetectingRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || !canvas) {
        scheduleNext();
        return;
      }

      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) { scheduleNext(); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        isDetectingRef.current = true;
        // ImageData is structured-cloneable — copied to worker, no OffscreenCanvas needed
        worker.postMessage({ type: 'DETECT', imageData });
      } catch {
        scheduleNext();
      }
    }

    worker.onmessage = (event) => {
      const msg = event.data;

      if (msg.type === 'READY') {
        console.log('[PhoneDetection] Worker ready');
        isWorkerReadyRef.current = true;
        setIsSupported(true);
        scheduleNext();
        return;
      }

      if (msg.type === 'ERROR') {
        console.error('[PhoneDetection] Worker error:', msg.message);
        setIsSupported(false);
        return;
      }

      if (msg.type === 'RESULT') {
        isDetectingRef.current = false;

        const predictions: Array<{ class: string; score: number }> = msg.predictions;
        const phoneFound = predictions.some(
          (p) => p.class === 'cell phone' && p.score >= confidenceThreshold,
        );

        console.log('[PhoneDetection] result:', predictions, '| phone:', phoneFound);

        setIsPhoneDetected(phoneFound);

        if (phoneFound) {
          badFrameCountRef.current++;
          if (badFrameCountRef.current >= consecutiveChecks && lastViolationTypeRef.current === null) {
            console.log('[PhoneDetection] PHONE_DETECTED logged');
            lastViolationTypeRef.current = 'PHONE_DETECTED';
            setLastViolation('PHONE_DETECTED');
          }
        } else {
          badFrameCountRef.current = 0;
          if (lastViolationTypeRef.current !== null) {
            console.log('[PhoneDetection] Phone cleared');
            lastViolationTypeRef.current = null;
            setLastViolation(null);
          }
        }

        // Schedule next frame only after result received — prevents pileup
        if (!cancelledRef.current) scheduleNext();
      }
    };

    return () => {
      cancelledRef.current = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }

      canvasRef.current = null;
      isWorkerReadyRef.current = false;
      isDetectingRef.current = false;
      badFrameCountRef.current = 0;
      lastViolationTypeRef.current = null;
    };
  }, [stream, enabled, checkInterval, consecutiveChecks, confidenceThreshold]);

  return { isPhoneDetected, isSupported, lastViolation };
}
