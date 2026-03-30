// components/candidate/profile/badges/BadgeProgress.tsx

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { BadgeProgress as BadgeProgressType } from '@/src/types/badge.types';

interface BadgeProgressProps {
  progress: BadgeProgressType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const BadgeProgress: React.FC<BadgeProgressProps> = ({
  progress,
  size = 'md',
  showLabel = true,
}) => {
  const { current, required, percentage } = progress;

  // Size variants
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  };

  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className="w-full space-y-1.5">
      {/* Progress Bar */}
      <div className={`relative w-full bg-gray-100 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: 0.1,
          }}
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
        />
      </div>

      {/* Label */}
      {showLabel && (
        <div className={`flex items-center justify-between ${textSizeClasses[size]} text-gray-600`}>
          <span>
            <span className="font-semibold text-blue-600">{current}</span>
            {' / '}
            <span className="text-gray-500">{required}</span>
          </span>
          <span className="font-medium text-gray-700">
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
};

export default BadgeProgress;