'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface MediaDevicesState {
  hasPermission: boolean;
  isRequesting: boolean;
  error: string | null;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  selectedVideoDeviceId: string | null;
  selectedAudioDeviceId: string | null;
}

interface UseMediaDevicesReturn extends MediaDevicesState {
  requestPermissions: () => Promise<boolean>;
  selectVideoDevice: (deviceId: string) => void;
  selectAudioDevice: (deviceId: string) => void;
  getStream: () => Promise<MediaStream | null>;
  releaseStream: () => void;
  stream: MediaStream | null;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [state, setState] = useState<MediaDevicesState>({
    hasPermission: false,
    isRequesting: false,
    error: null,
    videoDevices: [],
    audioDevices: [],
    selectedVideoDeviceId: null,
    selectedAudioDeviceId: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  // Enumerate available devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');

      setState(prev => ({
        ...prev,
        videoDevices,
        audioDevices,
        selectedVideoDeviceId: prev.selectedVideoDeviceId || videoDevices[0]?.deviceId || null,
        selectedAudioDeviceId: prev.selectedAudioDeviceId || audioDevices[0]?.deviceId || null,
      }));
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }, []);

  // Request camera and microphone permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isRequesting: true, error: null }));

    try {
      // Request permissions by getting a stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Stop the stream immediately (we just wanted permissions)
      stream.getTracks().forEach(track => track.stop());

      // Now enumerate devices (labels are available after permission)
      await enumerateDevices();

      setState(prev => ({
        ...prev,
        hasPermission: true,
        isRequesting: false,
      }));

      return true;
    } catch (err: any) {
      let errorMessage = 'Failed to access camera/microphone';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access was denied. Please allow access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.';
      }

      setState(prev => ({
        ...prev,
        hasPermission: false,
        isRequesting: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [enumerateDevices]);

  // Select video device
  const selectVideoDevice = useCallback((deviceId: string) => {
    setState(prev => ({ ...prev, selectedVideoDeviceId: deviceId }));
  }, []);

  // Select audio device
  const selectAudioDevice = useCallback((deviceId: string) => {
    setState(prev => ({ ...prev, selectedAudioDeviceId: deviceId }));
  }, []);

  // Get media stream with selected devices
  const getStream = useCallback(async (): Promise<MediaStream | null> => {
    // Release existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: state.selectedVideoDeviceId
          ? { deviceId: { exact: state.selectedVideoDeviceId } }
          : true,
        audio: state.selectedAudioDeviceId
          ? { deviceId: { exact: state.selectedAudioDeviceId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      return stream;
    } catch (err: any) {
      console.error('Failed to get media stream:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to access camera/microphone',
      }));
      return null;
    }
  }, [state.selectedVideoDeviceId, state.selectedAudioDeviceId]);

  // Release media stream
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseStream();
    };
  }, [releaseStream]);

  return {
    ...state,
    stream: streamRef.current,
    requestPermissions,
    selectVideoDevice,
    selectAudioDevice,
    getStream,
    releaseStream,
  };
}
