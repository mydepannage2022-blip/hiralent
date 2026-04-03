'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Briefcase, Info, Users, MessageSquare, Maximize, Minimize } from 'lucide-react';

interface InterviewBottomBarProps {
  jobTitle?: string;
  showTranscript?: boolean;
  onToggleTranscript?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const InterviewBottomBar: React.FC<InterviewBottomBarProps> = ({
  jobTitle,
  showTranscript = true,
  onToggleTranscript,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsed, setElapsed] = useState(0); // seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#111827] border-t border-white/10 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Time + Interview Title */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{formatTime(currentTime)}</span>
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-white font-semibold">{formatElapsed(elapsed)}</span>
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            <span>
              AI Interview for <span className="font-bold text-white">{jobTitle || 'Position'}</span>
            </span>
          </div>
        </div>

        {/* Right: Icon Buttons */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <Info className="w-4 h-4" />
          </button>

          {/* Users icon with badge showing 2 participants */}
          <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <Users className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#005DDC] rounded-full text-white text-[10px] flex items-center justify-center font-bold">
              2
            </span>
          </button>

          {/* Message icon toggles transcript */}
          <button
            onClick={onToggleTranscript}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              showTranscript
                ? 'text-white bg-white/20'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={onToggleFullscreen}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isFullscreen
                ? 'text-white bg-white/20'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewBottomBar;
