'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Volume2,
} from 'lucide-react';
import { useMediaDevices } from '@/src/hooks/interview';

interface InterviewSetupProps {
  onReady: () => void;
  onCancel: () => void;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onReady, onCancel }) => {
  const {
    hasPermission,
    isRequesting,
    error,
    videoDevices,
    audioDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    requestPermissions,
    selectVideoDevice,
    selectAudioDevice,
    getStream,
    releaseStream,
  } = useMediaDevices();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showVideoDropdown, setShowVideoDropdown] = useState(false);
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  // Get stream when permission is granted
  useEffect(() => {
    if (hasPermission) {
      initStream();
    }
    return () => {
      cleanupStream();
    };
  }, [hasPermission, selectedVideoDeviceId, selectedAudioDeviceId]);

  const initStream = async () => {
    cleanupStream();
    const newStream = await getStream();
    if (newStream) {
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setupAudioAnalyser(newStream);
    }
  };

  const cleanupStream = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    releaseStream();
  };

  const setupAudioAnalyser = (mediaStream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);
    analyser.fftSize = 256;

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, average * 1.5));
        animationRef.current = requestAnimationFrame(updateLevel);
      }
    };
    updateLevel();
  };

  const handleTestSpeaker = () => {
    const utterance = new SpeechSynthesisUtterance('Hello! This is a test of your audio output.');
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  if (isRequesting) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">Requesting camera and microphone access...</p>
      </div>
    );
  }

  if (error || !hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Camera/Microphone Access Required</h3>
        <p className="text-gray-600 text-center max-w-md mb-6">
          {error || 'Please allow access to your camera and microphone to continue with the interview.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => requestPermissions()}
            className="px-6 py-2 bg-[#005DDC] text-white rounded-lg hover:bg-[#004EB7]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Preview */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video max-w-2xl mx-auto">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />

        {/* Status Indicators */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="flex items-center gap-1.5 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm">
            <Video className="w-4 h-4 text-green-400" />
            <span>Camera On</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm">
            <Mic className="w-4 h-4 text-green-400" />
            <span>Mic On</span>
          </div>
        </div>
      </div>

      {/* Device Selection */}
      <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Camera Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Camera</label>
          <button
            onClick={() => setShowVideoDropdown(!showVideoDropdown)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 overflow-hidden"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Camera className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-sm truncate">
                {videoDevices.find(d => d.deviceId === selectedVideoDeviceId)?.label || 'Default Camera'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
          </button>

          {showVideoDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {videoDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => {
                    selectVideoDevice(device.deviceId);
                    setShowVideoDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    device.deviceId === selectedVideoDeviceId ? 'bg-blue-50 text-[#005DDC]' : ''
                  }`}
                >
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Microphone Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Microphone</label>
          <button
            onClick={() => setShowAudioDropdown(!showAudioDropdown)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 overflow-hidden"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Mic className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-sm truncate">
                {audioDevices.find(d => d.deviceId === selectedAudioDeviceId)?.label || 'Default Microphone'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
          </button>

          {showAudioDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {audioDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => {
                    selectAudioDevice(device.deviceId);
                    setShowAudioDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    device.deviceId === selectedAudioDeviceId ? 'bg-blue-50 text-[#005DDC]' : ''
                  }`}
                >
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audio Level Indicator */}
      <div className="max-w-2xl mx-auto">
        <label className="block text-sm font-medium text-gray-700 mb-2">Microphone Level</label>
        <div className="flex items-center gap-3">
          <Mic className="w-5 h-5 text-gray-500" />
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-linear-to-r from-green-400 to-green-500 rounded-full"
              animate={{ width: `${audioLevel}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="text-sm text-gray-500 w-12">{Math.round(audioLevel)}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Speak to test your microphone</p>
      </div>

      {/* Test Speaker Button */}
      <div className="max-w-2xl mx-auto">
        <button
          onClick={handleTestSpeaker}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
        >
          <Volume2 className="w-4 h-4" />
          Test Speaker
        </button>
      </div>

      {/* Checklist */}
      <div className="max-w-2xl mx-auto bg-green-50 border border-green-100 rounded-xl p-4">
        <h4 className="font-medium text-green-900 mb-3">Setup Checklist</h4>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Camera is working
          </li>
          <li className="flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Microphone is connected
          </li>
          <li className="flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600" />
            You are in a quiet environment
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="max-w-2xl mx-auto flex justify-between">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onReady}
          className="px-8 py-2.5 bg-[#005DDC] text-white rounded-lg font-medium hover:bg-[#004EB7] transition-colors"
        >
          I'm Ready to Start
        </button>
      </div>
    </div>
  );
};

export default InterviewSetup;
