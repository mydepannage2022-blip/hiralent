'use client';

import React, { useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isRecording?: boolean;
  showControls?: boolean;
  onToggleVideo?: () => void;
  onToggleAudio?: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  stream,
  isVideoEnabled = true,
  isAudioEnabled = true,
  isRecording = false,
  showControls = false,
  onToggleVideo,
  onToggleAudio,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

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

      {/* Status Indicators */}
      <div className="absolute top-4 left-4 flex gap-2">
        <div className={`flex items-center gap-1.5 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm ${
          !isVideoEnabled ? 'opacity-50' : ''
        }`}>
          {isVideoEnabled ? (
            <Video className="w-4 h-4 text-green-400" />
          ) : (
            <VideoOff className="w-4 h-4 text-red-400" />
          )}
          <span>{isVideoEnabled ? 'Camera On' : 'Camera Off'}</span>
        </div>
        <div className={`flex items-center gap-1.5 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm ${
          !isAudioEnabled ? 'opacity-50' : ''
        }`}>
          {isAudioEnabled ? (
            <Mic className="w-4 h-4 text-green-400" />
          ) : (
            <MicOff className="w-4 h-4 text-red-400" />
          )}
          <span>{isAudioEnabled ? 'Mic On' : 'Mic Off'}</span>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
          {onToggleVideo && (
            <button
              onClick={onToggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isVideoEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          )}
          {onToggleAudio && (
            <button
              onClick={onToggleAudio}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isAudioEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
