'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type FaceViolationType = 'NO_FACE' | 'MULTIPLE_FACES' | 'LOOKING_AWAY';

interface UseFaceDetectionOptions {
  stream: MediaStream | null;
  enabled?: boolean;
  checkInterval?: number;    // ms between checks (default 3000)
  consecutiveChecks?: number; // bad frames required before flagging (default 2)
}

interface UseFaceDetectionReturn {
  faceCount: number;
  isNoFace: boolean;
  isMultipleFaces: boolean;
  isLookingAway: boolean;
  isSupported: boolean;
  lastViolation: FaceViolationType | null;
}

/** Load face_detection.js via script tag (sets window.FaceDetection global) */
function loadFaceDetectionScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = window as any;

    // Already loaded
    if (typeof win.FaceDetection === 'function') {
      resolve(win.FaceDetection);
      return;
    }

    // Script already injected — wait for it
    const existingScript = document.getElementById('mediapipe-face-detection');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (typeof win.FaceDetection === 'function') {
          resolve(win.FaceDetection);
        } else {
          reject(new Error('FaceDetection global not found after script load'));
        }
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'mediapipe-face-detection';
    script.src = '/mediapipe/face_detection/face_detection.js';
    script.onload = () => {
      if (typeof win.FaceDetection === 'function') {
        resolve(win.FaceDetection);
      } else {
        reject(new Error('FaceDetection global not found after script load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load face_detection.js'));
    document.head.appendChild(script);
  });
}

/**
 * Estimate horizontal head yaw from MediaPipe face_detection landmarks.
 * Landmarks: [0]=right_eye, [1]=left_eye, [2]=nose_tip, [3]=mouth_center,
 *             [4]=right_ear_tragion, [5]=left_ear_tragion
 *
 * When facing forward, the nose lies near the midpoint between both ears.
 * When the head turns significantly, the nose shifts toward the near ear.
 * Returns true when the head is turned enough to suggest looking off-screen.
 */
function isHeadTurnedAway(
  landmarks: Array<{ x: number; y: number }>,
  threshold = 0.35,
): boolean {
  if (!landmarks || landmarks.length < 6) return false;

  const ear1X = landmarks[4].x; // right ear tragion
  const ear2X = landmarks[5].x; // left ear tragion
  const noseX = landmarks[2].x;

  const earSpan = Math.abs(ear2X - ear1X);
  if (earSpan < 0.02) return false; // face too small / partially out of frame

  const earMidX = (ear1X + ear2X) / 2;
  const offset = Math.abs(noseX - earMidX) / earSpan;

  // offset ≈ 0 when facing forward; grows as head turns
  // > 0.35 corresponds roughly to 35–40° of horizontal rotation
  return offset > threshold;
}

export function useFaceDetection({
  stream,
  enabled = true,
  checkInterval = 3000,
  consecutiveChecks = 2,
}: UseFaceDetectionOptions): UseFaceDetectionReturn {
  const [faceCount, setFaceCount] = useState(1);
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastViolation, setLastViolation] = useState<FaceViolationType | null>(null);

  const detectorRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const badFrameCountRef = useRef(0);
  const lastViolationTypeRef = useRef<FaceViolationType | null>(null);

  const runDetection = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
    try {
      await detectorRef.current.send({ image: videoRef.current });
    } catch (err) {
      console.error('[FaceDetection] Frame send error:', err);
    }
  }, []);

  useEffect(() => {
    if (!stream || !enabled) return;

    let cancelled = false;

    const initDetector = async () => {
      try {
        const FaceDetection = await loadFaceDetectionScript();

        if (cancelled) return;

        const detector = new FaceDetection({
          locateFile: (file: string) => `/mediapipe/face_detection/${file}`,
        });

        detector.setOptions({ model: 'short', minDetectionConfidence: 0.5 });

        detector.onResults((results: any) => {
          if (cancelled) return;
          const count = results.detections?.length ?? 0;
          setFaceCount(count);

          // Determine current violation (priority: NO_FACE > MULTIPLE_FACES > LOOKING_AWAY)
          let violation: FaceViolationType | null = null;
          if (count === 0) {
            violation = 'NO_FACE';
            setIsLookingAway(false);
          } else if (count > 1) {
            violation = 'MULTIPLE_FACES';
            setIsLookingAway(false);
          } else {
            // Exactly one face — check head yaw
            const landmarks = results.detections[0]?.landmarks;
            const turned = isHeadTurnedAway(landmarks);
            setIsLookingAway(turned);
            if (turned) violation = 'LOOKING_AWAY';
          }

          if (violation) {
            badFrameCountRef.current++;
            if (
              badFrameCountRef.current >= consecutiveChecks &&
              violation !== lastViolationTypeRef.current
            ) {
              lastViolationTypeRef.current = violation;
              setLastViolation(violation);
            }
          } else {
            badFrameCountRef.current = 0;
            if (lastViolationTypeRef.current !== null) {
              lastViolationTypeRef.current = null;
              setLastViolation(null);
            }
          }
        });

        await detector.initialize();
        if (cancelled) { detector.close(); return; }

        detectorRef.current = detector;
        setIsSupported(true);

        // Hidden video element for frame analysis
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.play().catch((err) => console.error('[FaceDetection] Hidden video play failed:', err));
        videoRef.current = video;

        intervalRef.current = setInterval(runDetection, checkInterval);
      } catch (err) {
        console.error('[FaceDetection] Initialization failed:', err);
        setIsSupported(false);
      }
    };

    initDetector();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      detectorRef.current?.close();
      detectorRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      badFrameCountRef.current = 0;
      lastViolationTypeRef.current = null;
    };
  }, [stream, enabled, checkInterval, consecutiveChecks, runDetection]);

  return {
    faceCount,
    isNoFace: faceCount === 0,
    isMultipleFaces: faceCount > 1,
    isLookingAway,
    isSupported,
    lastViolation,
  };
}
