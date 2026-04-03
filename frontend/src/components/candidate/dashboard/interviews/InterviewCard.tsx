'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Play, Eye } from 'lucide-react';
import InterviewStatusBadge from './InterviewStatusBadge';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

interface InterviewCardProps {
  interview: CandidateInterviewListItem;
  onStart: () => void;
  onView: () => void;
}

const statusAccent: Record<string, string> = {
  PENDING: 'bg-amber-400',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-emerald-500',
  FAILED: 'bg-gray-300',
  EXPIRED: 'bg-gray-300',
  CANCELLED: 'bg-gray-300',
};

const InterviewCard: React.FC<InterviewCardProps> = ({ interview, onStart, onView }) => {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: string | Date | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const isScheduledTimeReached = () => {
    if (!interview.scheduledDate) return true;
    return Date.now() >= new Date(interview.scheduledDate).getTime();
  };

  const statusAllowsStart = interview.status === 'PENDING';
  const timeAllowsStart = isScheduledTimeReached();
  const canStart = statusAllowsStart && timeAllowsStart;
  const isWaiting = statusAllowsStart && !timeAllowsStart;
  const isCompleted = interview.status === 'COMPLETED';
  const isInactive = interview.status === 'FAILED' || interview.status === 'EXPIRED' || interview.status === 'CANCELLED';

  const initials = interview.companyName
    ? interview.companyName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AI';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all"
    >
      {/* Status accent bar */}
      <div className={`h-1 w-full ${statusAccent[interview.status] ?? 'bg-gray-200'}`} />

      <div className="p-5">
        {/* Top row: avatar + title + badge */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#005DDC] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 leading-tight truncate">{interview.jobTitle}</h3>
            {interview.companyName && (
              <p className="text-sm text-gray-500 truncate">{interview.companyName}</p>
            )}
          </div>
          <InterviewStatusBadge status={interview.status} />
        </div>

        {/* Date row */}
        {interview.scheduledDate ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>{formatDate(interview.scheduledDate)}</span>
            <span className="text-gray-300">·</span>
            <span>{formatTime(interview.scheduledDate)}</span>
          </div>
        ) : (
          <div className="mb-4" />
        )}

        {/* Action */}
        <div className="pt-3 border-t border-gray-100">
          {canStart && (
            <button
              onClick={onStart}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005DDC] text-white rounded-xl font-medium text-sm hover:bg-[#004EB7] active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Interview
            </button>
          )}

          {isWaiting && (
            <div className="flex flex-col items-center py-1 gap-0.5">
              <div className="flex items-center gap-1.5 text-amber-600 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Not available yet
              </div>
              <p className="text-xs text-gray-400">
                Opens {formatDate(interview.scheduledDate)} at {formatTime(interview.scheduledDate)}
              </p>
            </div>
          )}

          {isCompleted && (
            <button
              onClick={onView}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Submission
            </button>
          )}

          {isInactive && (
            <p className="text-center text-xs text-gray-400 py-1.5">
              {interview.status === 'EXPIRED' ? 'This interview has expired' : 'Interview no longer available'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InterviewCard;
