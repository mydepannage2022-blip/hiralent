"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock, Target, TrendingUp } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  score?: number;
}

interface ProgressBarProps {
  currentQuestion: number;
  totalQuestions: number;
  currentScore?: number;
  timeElapsed?: number;
  totalTime?: number;
  steps?: ProgressStep[];
  showDetailedProgress?: boolean;
  showScore?: boolean;
  showTime?: boolean;
  variant?: 'simple' | 'detailed' | 'circular';
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentQuestion,
  totalQuestions,
  currentScore,
  timeElapsed,
  totalTime,
  steps,
  showDetailedProgress = false,
  showScore = false,
  showTime = false,
  variant = 'simple',
  className = ''
}) => {
  const progressPercentage = Math.round((currentQuestion / totalQuestions) * 100);
  const timeProgressPercentage = totalTime ? Math.round((timeElapsed || 0) / totalTime * 100) : 0;

  // Simple Progress Bar
  if (variant === 'simple') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#005DDC]" />
            <span className="font-medium text-[#222]">Assessment Progress</span>
          </div>
          <span className="text-sm font-semibold text-[#005DDC]">
            {currentQuestion} of {totalQuestions}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <motion.div
            className="bg-[#005DDC] h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-[#757575]">
          <span>{progressPercentage}% Complete</span>
          {showScore && currentScore && (
            <span>Current Score: {currentScore}%</span>
          )}
        </div>
      </div>
    );
  }

  // Circular Progress
  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    return (
      <div className={`flex items-center gap-6 ${className}`}>
        <div className="relative w-24 h-24">
          <svg className="transform -rotate-90 w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="45"
              className="stroke-gray-200"
              strokeWidth="6"
              fill="transparent"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              className="stroke-[#005DDC]"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-[#005DDC]">{progressPercentage}%</div>
              <div className="text-xs text-[#757575]">Complete</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="text-lg font-semibold text-[#222]">
            Question {currentQuestion} of {totalQuestions}
          </div>
          {showScore && currentScore !== undefined && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              Score: {currentScore}%
            </div>
          )}
          {showTime && timeElapsed && totalTime && (
            <div className="flex items-center gap-2 text-sm text-[#757575]">
              <Clock className="h-4 w-4" />
              {Math.round(timeElapsed / 60)}m / {Math.round(totalTime / 60)}m
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detailed Progress with Steps
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-[#005DDC]" />
          <h3 className="text-lg font-semibold text-[#222] text-sm">Assessment Progress</h3>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#005DDC]">{progressPercentage}%</div>
          <div className="text-xs text-[#757575]">Complete</div>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-[#757575] mb-2">
          <span>Question Progress</span>
          <span>{currentQuestion} of {totalQuestions}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <motion.div
            className="bg-[#005DDC] h-4 rounded-full relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
      </div>

      {/* Question Steps (if provided) */}
      {steps && steps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[#222] mb-3">Question Breakdown</h4>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  step.status === 'completed' ? 'bg-green-50 border border-green-200' :
                  step.status === 'current' ? 'bg-blue-50 border border-blue-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'current' ? 'bg-[#005DDC]' :
                    'bg-gray-300'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : step.status === 'current' ? (
                      <Circle className="h-4 w-4 text-white fill-current" />
                    ) : (
                      <Circle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'current' ? 'text-[#005DDC]' :
                    'text-[#757575]'
                  }`}>
                    {step.label}
                  </span>
                </div>
                
                {step.score !== undefined && step.status === 'completed' && (
                  <span className="text-sm font-semibold text-green-600">
                    {step.score}%
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-[#005DDC] mb-1">
            {currentQuestion}
          </div>
          <div className="text-xs text-[#757575]">Questions Done</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-[#222] mb-1">
            {totalQuestions - currentQuestion}
          </div>
          <div className="text-xs text-[#757575]">Remaining</div>
        </div>

        {showScore && currentScore !== undefined && (
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {currentScore}%
            </div>
            <div className="text-xs text-[#757575]">Current Score</div>
          </div>
        )}

        {showTime && timeElapsed && totalTime && (
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {Math.round((timeElapsed / totalTime) * 100)}%
            </div>
            <div className="text-xs text-[#757575]">Time Used</div>
          </div>
        )}
      </div>

      {/* Time Progress Bar */}
      {showTime && timeElapsed && totalTime && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-[#757575] mb-2">
            <span>Time Progress</span>
            <span>{Math.round(timeElapsed / 60)}m of {Math.round(totalTime / 60)}m</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${
                timeProgressPercentage > 80 ? 'bg-red-500' :
                timeProgressPercentage > 60 ? 'bg-orange-500' :
                'bg-green-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${timeProgressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      )}

      {/* Motivational Message */}
      {showDetailedProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center gap-2 text-[#005DDC]">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium text-sm">
              {progressPercentage < 25 ? "Great start! Keep going!" :
               progressPercentage < 50 ? "You're making good progress!" :
               progressPercentage < 75 ? "More than halfway there!" :
               progressPercentage < 100 ? "Almost finished! You've got this!" :
               "Congratulations! Assessment complete!"}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProgressBar;