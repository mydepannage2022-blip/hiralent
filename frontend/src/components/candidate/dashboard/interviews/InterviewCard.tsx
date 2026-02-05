'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Briefcase, Building2, Play, Eye, Clock } from 'lucide-react';
import InterviewStatusBadge from './InterviewStatusBadge';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

interface InterviewCardProps {
  interview: CandidateInterviewListItem;
  onStart: () => void;
  onView: () => void;
}

const InterviewCard: React.FC<InterviewCardProps> = ({ interview, onStart, onView }) => {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Not scheduled';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string | Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Check if the scheduled time has arrived
  const isScheduledTimeReached = () => {
    if (!interview.scheduledDate) return true; // No scheduled date means can start anytime
    const scheduledTime = new Date(interview.scheduledDate).getTime();
    const now = Date.now();
    return now >= scheduledTime;
  };

  const statusAllowsStart = interview.status === 'PENDING' || interview.status === 'IN_PROGRESS';
  const timeAllowsStart = isScheduledTimeReached();
  const canStart = statusAllowsStart && timeAllowsStart;
  const isWaitingForScheduledTime = statusAllowsStart && !timeAllowsStart;
  const isCompleted = interview.status === 'COMPLETED';
  const isFailed = interview.status === 'FAILED';
  const isExpiredOrCancelled = interview.status === 'EXPIRED' || interview.status === 'CANCELLED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {interview.jobTitle}
          </h3>
          {interview.companyName && (
            <div className="flex items-center gap-1.5 text-gray-600 text-sm">
              <Building2 className="w-4 h-4" />
              <span>{interview.companyName}</span>
            </div>
          )}
        </div>
        <InterviewStatusBadge status={interview.status} />
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {interview.scheduledDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(interview.scheduledDate)}</span>
            <span className="text-gray-400">•</span>
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{formatTime(interview.scheduledDate)}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Briefcase className="w-4 h-4 text-gray-400" />
          <span>AI Video Interview</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-3 border-t border-gray-100">
        {canStart && (
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005DDC] text-white rounded-lg font-medium hover:bg-[#004EB7] transition-colors"
          >
            <Play className="w-4 h-4" />
            {interview.status === 'IN_PROGRESS' ? 'Continue Interview' : 'Start Interview'}
          </button>
        )}

        {isWaitingForScheduledTime && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2 text-amber-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Not Available Yet</span>
            </div>
            <p className="text-xs text-gray-500">
              Available on {formatDate(interview.scheduledDate)} at {formatTime(interview.scheduledDate)}
            </p>
          </div>
        )}

        {isCompleted && (
          <button
            onClick={onView}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
        )}

        {isFailed && (
          <div className="text-center text-sm text-red-500 py-2">
            This interview session has timed out
          </div>
        )}

        {isExpiredOrCancelled && (
          <div className="text-center text-sm text-gray-500 py-2">
            This interview is no longer available
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InterviewCard;
