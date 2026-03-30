'use client';

import React, { useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';
import { useAudioLevel } from '@/src/hooks/interview/useAudioLevel';

interface VideoPreviewProps {
  stream: MediaStream | null;
  isVideoEnabled?: boolean;
  isRecording?: boolean;
  candidateName?: string;
  isSpeaking?: boolean;
  isListening?: boolean;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  stream,
  isVideoEnabled = true,
  isRecording = false,
  candidateName = 'You',
  isSpeaking = false,
  isListening = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioLevels = useAudioLevel(stream, isListening);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden h-full">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transform scale-x-[-1] ${
          !isVideoEnabled ? 'hidden' : ''
        }`}
      />

      {/* Video Off Placeholder */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
            <VideoOff className="w-10 h-10 text-gray-400" />
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Recording
        </div>
      )}

      {/* Candidate Name + talking indicator - Bottom Left */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#111827]/80 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
        <span className="text-white text-sm font-medium">{candidateName}</span>
        {isListening && (
          <div className="flex items-end gap-0.5 h-4">
            {audioLevels.map((level, i) => {
              // Progressive slope: bars grow taller left → right
              const slopeMultiplier = 0.4 + (i / (audioLevels.length - 1)) * 0.6;
              const height = Math.max(15 + i * 8, level * 100 * slopeMultiplier);
              return (
                <span
                  key={i}
                  className="w-0.75 rounded-full bg-white transition-all duration-75"
                  style={{ height: `${Math.min(100, height)}%` }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* AI Interviewer PiP - Bottom Right */}
      <div className="absolute bottom-4 right-4 w-28 bg-[#111827]/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 p-3 flex flex-col items-center gap-2">
        {/* Circular photo */}
        <div className="w-14 h-14 rounded-full border border-white/10 overflow-hidden">
          <img src="/alex-avatar.png" alt="Alex" className="w-full h-full object-cover" />
        </div>
        {/* Name + audio bars */}
        <div className="flex items-center justify-between w-full px-0.5">
          <span className="text-gray-300 text-xs font-medium">Alex</span>
          {isSpeaking && (
            <div className="flex items-end gap-0.5 h-4">
              {[0, 1, 2, 3].map((i) => {
                const slopeMultiplier = 0.4 + (i / 3) * 0.6;
                return (
                  <span
                    key={i}
                    className="w-0.75 rounded-full bg-white transition-all duration-75"
                    style={{
                      height: `${15 + i * 8 + slopeMultiplier * 40}%`,
                      animation: `pulse ${0.3 + i * 0.1}s ease-in-out infinite alternate`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
