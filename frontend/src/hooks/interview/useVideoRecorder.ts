'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVideoRecorderOptions {
  mimeType?: string;
  videoBitsPerSecond?: number;
}

interface UseVideoRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  videoBlob: Blob | null;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  clearRecording: () => void;
  getCurrentBlob: () => Blob | null;
}

/**
 * Hook for recording video from a MediaStream using MediaRecorder API
 */
export function useVideoRecorder(
  stream: MediaStream | null,
  options: UseVideoRecorderOptions = {}
): UseVideoRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');
  const stopPromiseRef = useRef<{
    resolve: (blob: Blob | null) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Check browser support
  const isSupported = typeof MediaRecorder !== 'undefined';

  // Determine best supported MIME type
  const getMimeType = useCallback(() => {
    if (options.mimeType && MediaRecorder.isTypeSupported(options.mimeType)) {
      return options.mimeType;
    }

    // Prefer WebM with VP9 codec for better quality and compression
    const preferredTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm'; // Fallback
  }, [options.mimeType]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!stream) {
      setError('No media stream available');
      return;
    }

    if (!isSupported) {
      setError('MediaRecorder is not supported in this browser');
      return;
    }

    if (isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      // Guard: ensure stream tracks are still live before creating MediaRecorder
      const liveTracks = stream.getTracks().filter(t => t.readyState === 'live');
      if (liveTracks.length === 0) {
        console.error('MediaRecorder: all stream tracks are ended — cannot start recording');
        setError('Camera stream has ended. Please refresh the page.');
        return;
      }

      // Clear previous recording
      chunksRef.current = [];
      setVideoBlob(null);
      setError(null);

      const mimeType = getMimeType();
      mimeTypeRef.current = mimeType; // Store in ref for onstop handler
      console.log(`🎬 Starting video recording with MIME type: ${mimeType}`);

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond || 2500000, // 2.5 Mbps default
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log(`📦 Recorded chunk: ${(event.data.size / 1024).toFixed(2)} KB`);
        }
      };

      recorder.onerror = (event: Event) => {
        const err = (event as any).error;
        console.error('MediaRecorder error:', err?.name, err?.message, event);
        setError(`Recording error: ${err?.name ?? 'unknown'}`);
        setIsRecording(false);
      };

      recorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped');
        const chunks = chunksRef.current;
        const storedMimeType = mimeTypeRef.current;

        if (chunks.length === 0) {
          console.warn('No chunks recorded');
          setVideoBlob(null);
          if (stopPromiseRef.current) {
            stopPromiseRef.current.resolve(null);
            stopPromiseRef.current = null;
          }
          return;
        }

        const blob = new Blob(chunks, { type: storedMimeType });
        console.log(`✅ Video recorded: ${(blob.size / 1024 / 1024).toFixed(2)} MB, type: ${blob.type}`);
        setVideoBlob(blob);

        if (stopPromiseRef.current) {
          stopPromiseRef.current.resolve(blob);
          stopPromiseRef.current = null;
        }
      };

      // Start recording with 1 second chunks for real-time data collection
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      console.log('🎬 Recording started');
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Failed to start recording');
    }
  }, [stream, isSupported, isRecording, getMimeType, options.videoBitsPerSecond]);

  // Stop recording and return the video blob
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        console.warn('Not currently recording');
        resolve(videoBlob);
        return;
      }

      // Store the promise callbacks for the onstop handler
      stopPromiseRef.current = { resolve, reject };

      try {
        console.log('🛑 Stopping recording...');
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (err: any) {
        console.error('Failed to stop recording:', err);
        setError(err.message || 'Failed to stop recording');
        reject(err);
      }
    });
  }, [isRecording, videoBlob]);

  // Synchronously build a blob from accumulated chunks (no need to stop recorder)
  const getCurrentBlob = useCallback((): Blob | null => {
    if (chunksRef.current.length === 0) return null;
    return new Blob(chunksRef.current, { type: mimeTypeRef.current });
  }, []);

  // Clear the current recording
  const clearRecording = useCallback(() => {
    chunksRef.current = [];
    setVideoBlob(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    isRecording,
    isSupported,
    videoBlob,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    getCurrentBlob,
  };
}
