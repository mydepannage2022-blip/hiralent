'use client';

import React from 'react';
import { AIInterviewStatus } from '@/src/types/interview.types';

interface InterviewStatusBadgeProps {
  status: AIInterviewStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const statusConfig: Record<AIInterviewStatus, { label: string; bgColor: string; textColor: string }> = {
  PENDING: {
    label: 'Pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  COMPLETED: {
    label: 'Completed',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  FAILED: {
    label: 'Failed',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
  EXPIRED: {
    label: 'Expired',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
  },
  CANCELLED: {
    label: 'Cancelled',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
};

const InterviewStatusBadge: React.FC<InterviewStatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default InterviewStatusBadge;
