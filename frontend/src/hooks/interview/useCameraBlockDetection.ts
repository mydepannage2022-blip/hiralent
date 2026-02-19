'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCameraBlockDetectionOptions {
  stream: MediaStream | null;
  enabled?: boolean;
  checkInterval?: number; // How often to check (ms)
  brightnessThreshold?: number; // Below this = blocked (0-255)
  consecutiveChecks?: number; // How many dark frames before triggering
}

interface UseCameraBlockDetectionReturn {
  isCameraBlocked: boolean;
  currentBrightness: number;
}

export function useCameraBlockDetection({
  stream,
  enabled = true,
  checkInterval = 2000,
  brightnessThreshold = 15, // Very dark = likely covered
  consecutiveChecks = 2, // Need 2 consecutive dark frames
}: UseCameraBlockDetectionOptions): UseCameraBlockDetectionReturn {
  const [isCameraBlocked, setIsCameraBlocked] = useState(false);
  const [currentBrightness, setCurrentBrightness] = useState(255);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const darkFrameCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate average brightness of video frame
  const checkBrightness = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState < 2) {
      return; // Video not ready
    }

    // Draw current frame to canvas (small size for performance)
    const sampleWidth = 64;
    const sampleHeight = 48;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;

    // Calculate average brightness (simple grayscale average)
    let totalBrightness = 0;
    const pixelCount = pixels.length / 4; // RGBA = 4 values per pixel

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // Perceived brightness formula
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / pixelCount;
    setCurrentBrightness(Math.round(avgBrightness));

    // Check if camera is blocked
    if (avgBrightness < brightnessThreshold) {
      darkFrameCountRef.current++;
      console.log(`📹 Dark frame detected (brightness: ${avgBrightness.toFixed(1)}, count: ${darkFrameCountRef.current})`);

      if (darkFrameCountRef.current >= consecutiveChecks) {
        if (!isCameraBlocked) {
          console.log('📹 Camera appears to be physically blocked');
          setIsCameraBlocked(true);
        }
      }
    } else {
      // Reset counter if frame is bright enough
      if (darkFrameCountRef.current > 0) {
        console.log(`📹 Bright frame detected (brightness: ${avgBrightness.toFixed(1)})`);
      }
      darkFrameCountRef.current = 0;

      if (isCameraBlocked) {
        console.log('📹 Camera unblocked');
        setIsCameraBlocked(false);
      }
    }
  }, [stream, brightnessThreshold, consecutiveChecks, isCameraBlocked]);

  // Setup video element and canvas
  useEffect(() => {
    if (!stream || !enabled) {
      return;
    }

    // Create hidden video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(err => console.error('Video play error:', err));
    videoRef.current = video;

    // Create canvas for frame analysis
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;

    // Start periodic checks
    intervalRef.current = setInterval(checkBrightness, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      canvasRef.current = null;
      darkFrameCountRef.current = 0;
    };
  }, [stream, enabled, checkInterval, checkBrightness]);

  return {
    isCameraBlocked,
    currentBrightness,
  };
}
