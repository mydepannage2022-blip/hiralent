"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, Pause, Play } from 'lucide-react';

interface QuestionTimerProps {
  totalTime: number; // in seconds
  onTimeUp?: () => void;
  onTimeWarning?: (remainingTime: number) => void;
  isPaused?: boolean;
  warningThreshold?: number; // seconds when to show warning (default: 30)
  criticalThreshold?: number; // seconds when to show critical warning (default: 10)
  showProgress?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const QuestionTimer: React.FC<QuestionTimerProps> = ({
  totalTime,
  onTimeUp,
  onTimeWarning,
  isPaused = false,
  warningThreshold = 30,
  criticalThreshold = 10,
  showProgress = true,
  className = '',
  size = 'medium'
}) => {
  const [timeRemaining, setTimeRemaining] = useState(totalTime);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarned = useRef(false);
  const hasCriticalWarned = useRef(false);

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-16 h-16',
      text: 'text-xs',
      icon: 'h-4 w-4',
      strokeWidth: 2
    },
    medium: {
      container: 'w-20 h-20',
      text: 'text-sm',
      icon: 'h-5 w-5',
      strokeWidth: 3
    },
    large: {
      container: 'w-24 h-24',
      text: 'text-base',
      icon: 'h-6 w-6',
      strokeWidth: 4
    }
  };

  const config = sizeConfig[size];

  useEffect(() => {
    setTimeRemaining(totalTime);
    hasWarned.current = false;
    hasCriticalWarned.current = false;
  }, [totalTime]);

  useEffect(() => {
    if (isPaused) {
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  }, [isPaused]);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Warning callbacks
          if (newTime === warningThreshold && !hasWarned.current) {
            hasWarned.current = true;
            onTimeWarning?.(newTime);
          }
          
          if (newTime === criticalThreshold && !hasCriticalWarned.current) {
            hasCriticalWarned.current = true;
            onTimeWarning?.(newTime);
          }
          
          // Time up callback
          if (newTime <= 0) {
            onTimeUp?.();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, warningThreshold, criticalThreshold, onTimeUp, onTimeWarning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= criticalThreshold) {
      return {
        bg: 'bg-red-50',
        text: 'text-red-600',
        stroke: 'stroke-red-500',
        ring: 'ring-red-200'
      };
    } else if (timeRemaining <= warningThreshold) {
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        stroke: 'stroke-orange-500',
        ring: 'ring-orange-200'
      };
    } else {
      return {
        bg: 'bg-blue-50',
        text: 'text-[#005DDC]',
        stroke: 'stroke-[#005DDC]',
        ring: 'ring-blue-200'
      };
    }
  };

  const colors = getTimerColor();
  const progress = (timeRemaining / totalTime) * 100;
  const circumference = 2 * Math.PI * 35; // radius = 35
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Circular Timer */}
      <motion.div 
        className={`relative ${config.container} ${colors.bg} rounded-full ring-4 ${colors.ring} flex items-center justify-center`}
        animate={timeRemaining <= criticalThreshold ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: timeRemaining <= criticalThreshold ? Infinity : 0 }}
      >
        
        {/* Progress Circle */}
        {showProgress && (
          <svg className="absolute inset-0 transform -rotate-90" width="100%" height="100%">
            <circle
              cx="50%"
              cy="50%"
              r="35"
              className="stroke-gray-200"
              strokeWidth={config.strokeWidth}
              fill="transparent"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="35"
              className={colors.stroke}
              strokeWidth={config.strokeWidth}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </svg>
        )}
        
        {/* Timer Content */}
        <div className="relative z-10 text-center">
          {isPaused ? (
            <Pause className={`${config.icon} ${colors.text} mx-auto`} />
          ) : (
            <Clock className={`${config.icon} ${colors.text} mx-auto mb-1`} />
          )}
          <div className={`font-bold ${config.text} ${colors.text}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </motion.div>

      {/* Timer Status */}
      <div className="flex flex-col">
        <div className="text-sm font-medium text-[#222] mb-1">
          Time Remaining
        </div>
        
        {/* Status Messages */}
        <AnimatePresence>
          {timeRemaining <= criticalThreshold && timeRemaining > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-1 text-red-600 text-xs font-medium"
            >
              <AlertTriangle className="h-3 w-3" />
              Critical! Submit soon
            </motion.div>
          )}
          
          {timeRemaining <= warningThreshold && timeRemaining > criticalThreshold && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-1 text-orange-600 text-xs font-medium"
            >
              <AlertTriangle className="h-3 w-3" />
              Running low on time
            </motion.div>
          )}
          
          {timeRemaining > warningThreshold && (
            <div className="text-[#757575] text-xs">
              Plenty of time left
            </div>
          )}

          {timeRemaining === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-red-600 text-xs font-bold"
            >
              <AlertTriangle className="h-3 w-3" />
              Time's up!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause Indicator */}
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 text-gray-500 text-xs mt-1"
          >
            <Pause className="h-3 w-3" />
            Timer paused
          </motion.div>
        )}
      </div>

      {/* Progress Bar (Alternative Display) */}
      {showProgress && size !== 'small' && (
        <div className="flex-1 max-w-xs">
          <div className="flex justify-between text-xs text-[#757575] mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full transition-colors ${
                timeRemaining <= criticalThreshold ? 'bg-red-500' :
                timeRemaining <= warningThreshold ? 'bg-orange-500' : 'bg-[#005DDC]'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionTimer;