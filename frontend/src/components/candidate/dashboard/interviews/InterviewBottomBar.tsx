'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Briefcase } from 'lucide-react';

interface InterviewBottomBarProps {
  jobTitle?: string;
  currentQuestion: number;
  totalQuestions: number;
}

const InterviewBottomBar: React.FC<InterviewBottomBarProps> = ({
  jobTitle,
  currentQuestion,
  totalQuestions,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Time + Interview Title */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{formatTime(currentTime)}</span>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            <span>
              AI Interview for <span className="font-bold">{jobTitle || 'Position'}</span>
            </span>
          </div>
        </div>

        {/* Right: Question Counter */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Question</span>
          <span className="font-semibold text-gray-900">
            {currentQuestion}/{totalQuestions}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InterviewBottomBar;
